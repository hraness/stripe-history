import { expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { collectPreviewOwner, createPreviewCommands, createPreviewSelection, hasUnprovedPreviewCustody, PreviewCustodyError } from "./compiled-preview-state";

test("a failed fresh generation leaves the selected output and server intact", async () => {
  const selection = createPreviewSelection<{ output: string; pid: number }>();
  const retired: number[] = [];
  const first = { output: "first-complete", pid: 10 };
  await selection.replace(async () => first, async (old) => { retired.push(old.pid); });
  await expect(selection.replace(async () => { throw new Error("compiler rejected recipe"); }, async (old) => { retired.push(old.pid); })).rejects.toThrow("compiler rejected recipe");
  expect(selection.current()).toBe(first);
  expect(retired).toEqual([]);
});

test("a successful replacement publishes only after preparation then retires exactly the old owner", async () => {
  const selection = createPreviewSelection<string>();
  const events: string[] = [];
  await selection.replace(async () => "first", async () => { throw new Error("unexpected retirement"); });
  await selection.replace(async () => {
    expect(selection.current()).toBe("first");
    events.push("build-complete", "candidate-health-and-identity");
    return "second";
  }, async (old) => {
    expect(selection.current()).toBe("second");
    expect(old).toBe("first");
    events.push("old-owner-collected");
  });
  expect(events).toEqual(["build-complete", "candidate-health-and-identity", "old-owner-collected"]);
  expect(selection.current()).toBe("second");
});

test("uncertain retirement is not silently presented as a successful replacement", async () => {
  const selection = createPreviewSelection<string>();
  await selection.replace(async () => "first", async () => {});
  await expect(selection.replace(async () => "second", async () => { throw new Error("owner survived"); })).rejects.toThrow("owner survived");
  expect(selection.current()).toBe("second");
});

test("stdin EOF during initial preparation is latched before readiness", async () => {
  const input = new PassThrough();
  const commands = createPreviewCommands(input);
  input.end();
  await new Promise<void>((done) => input.once("end", done));
  expect(commands.stopped()).toBe(true);
  expect((await commands.iterator.next()).done).toBe(true);
});

test("cancellation before readiness closes the already subscribed iterator", async () => {
  const input = new PassThrough();
  const commands = createPreviewCommands(input);
  commands.stop();
  expect(commands.stopped()).toBe(true);
  expect((await commands.iterator.next()).done).toBe(true);
  input.destroy();
});

test("commands received during initial build remain queued", async () => {
  const input = new PassThrough();
  const commands = createPreviewCommands(input);
  input.write("quit\n");
  await Promise.resolve();
  expect(await commands.iterator.next()).toEqual({ value: "quit", done: false });
  commands.stop();
  input.destroy();
});

test("failed candidate readiness plus uncertain retirement is fatal and retains ownership", async () => {
  const owned = new Set(["candidate"]);
  let failure: unknown;
  try {
    try { throw new Error("readiness identity failed"); }
    catch (error) {
      await collectPreviewOwner("candidate", async () => { throw new Error("group survived"); });
      owned.delete("candidate");
      throw error;
    }
  } catch (error) { failure = error; }
  expect(failure).toBeInstanceOf(PreviewCustodyError);
  expect(owned.has("candidate")).toBe(true);
  expect(hasUnprovedPreviewCustody(failure)).toBe(true);
  expect(hasUnprovedPreviewCustody(new AggregateError([new Error("wrapped", { cause: failure })]))).toBe(true);
  expect(hasUnprovedPreviewCustody(new Error("ordinary compilation failure"))).toBe(false);
});
