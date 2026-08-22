import { describe, expect, test } from "bun:test";
import { loadHistory } from "@/lib/content";
import { MARKDOWN_CONTENT_TYPE } from "@/lib/accept";

import { GET, HEAD, generateStaticParams } from "./route";

describe("Node markdown corpus handler", () => {
  test("serves homepage, category, event, and recovery markdown", async () => {
    const history = await loadHistory();
    const openRouter = history.events.find(
      ({ id }) => id === "openrouter-acquisition-talks-reported",
    );
    const root = await GET(new Request("https://stripedex.com/x-markdown"), {
      params: Promise.resolve({}),
    });
    const acquisitions = await GET(
      new Request("https://stripedex.com/x-markdown/history/acquisitions"),
      { params: Promise.resolve({ path: ["history", "acquisitions"] }) },
    );
    const event = await GET(
      new Request(
        "https://stripedex.com/x-markdown/history/acquisitions/openrouter-acquisition-talks-reported",
      ),
      {
        params: Promise.resolve({
          path: [
            "history",
            "acquisitions",
            "openrouter-acquisition-talks-reported",
          ],
        }),
      },
    );
    const missing = await GET(
      new Request("https://stripedex.com/x-markdown/this-does-not-exist"),
      { params: Promise.resolve({ path: ["this-does-not-exist"] }) },
    );
    const head = await HEAD(new Request("https://stripedex.com/x-markdown"), {
      params: Promise.resolve({}),
    });

    expect(root.status).toBe(200);
    expect(root.headers.get("content-type")).toBe(MARKDOWN_CONTENT_TYPE);
    expect(await root.text()).toContain(
      `# Stripe Company History: ${history.events.length} Sourced Events`,
    );
    expect(acquisitions.status).toBe(200);
    expect(await acquisitions.text()).toContain(
      openRouter?.title ?? "missing-openrouter",
    );
    const eventBody = await event.text();
    expect(event.status).toBe(200);
    expect(eventBody).toContain("not affiliated with, endorsed by, or operated by");
    expect(eventBody).toContain("https://www.axios.com/");
    const missingBody = await missing.text();
    expect(missing.status).toBe(404);
    expect(missingBody).toContain("https://stripedex.com/sitemap.xml");
    expect(missingBody).toContain("https://stripedex.com/llms.txt");
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("content-type")).toBe(MARKDOWN_CONTENT_TYPE);
  });

  test("prebuilds every public document path, including event pages", async () => {
    const history = await loadHistory();
    const params = await generateStaticParams();
    expect(params).toContainEqual({ path: [] });
    expect(params).toContainEqual({ path: ["about"] });
    expect(params).toContainEqual({ path: ["history", "acquisitions"] });
    expect(params).toContainEqual({
      path: ["history", "acquisitions", "openrouter-acquisition-talks-reported"],
    });
    expect(params.length).toBe(8 + history.categories.length + history.events.length);
  });
});
