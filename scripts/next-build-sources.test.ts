import { expect, test } from "bun:test";
import { withVercelToolbarSource } from "./next-build-sources";

const sources = { client: ["app/error.tsx", "support/theme.tsx"], edgeRsc: [], nodeRsc: ["app/page.tsx"] };
const toolbar = ".vercel/adapter-toolbar-script.js";

test("ordinary builds and disabled provider feedback retain the authored census", () => {
  for (const environment of [
    {}, { VERCEL_PREVIEW_COMMENTS_ENABLED: "1" },
    { NEXT_ADAPTER_PATH: "", VERCEL_PREVIEW_COMMENTS_ENABLED: "1" },
    { NEXT_ADAPTER_PATH: "/provider/adapter/index.js" },
    { NEXT_ADAPTER_PATH: "/provider/adapter/index.js", VERCEL_PREVIEW_COMMENTS_ENABLED: "0" },
    { NEXT_ADAPTER_PATH: "/provider/adapter/index.js", VERCEL_PREVIEW_COMMENTS_ENABLED: "true" },
  ]) expect(withVercelToolbarSource(sources, environment)).toBe(sources);
});

test("provider feedback declares exactly its client script in preview and production", () => {
  const before = structuredClone(sources);
  for (const VERCEL_ENV of ["preview", "production"]) {
    const result = withVercelToolbarSource(sources, {
      NEXT_ADAPTER_PATH: "/provider/adapter/index.js", VERCEL_PREVIEW_COMMENTS_ENABLED: "1", VERCEL_ENV,
    });
    expect(result).toEqual({ ...sources, client: [toolbar, ...sources.client] });
    expect(result.edgeRsc).toBe(sources.edgeRsc);
    expect(result.nodeRsc).toBe(sources.nodeRsc);
    expect(sources).toEqual(before);
  }
});

test("provider input cannot silently duplicate an authored inventory entry", () => {
  expect(() => withVercelToolbarSource({ ...sources, client: [toolbar, ...sources.client] }, {
    NEXT_ADAPTER_PATH: "/provider/adapter/index.js", VERCEL_PREVIEW_COMMENTS_ENABLED: "1",
  })).toThrow("authored source");
});
