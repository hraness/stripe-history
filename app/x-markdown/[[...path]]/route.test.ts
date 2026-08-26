import { describe, expect, test } from "bun:test";
import { loadHistory } from "@/lib/content";
import { MARKDOWN_CONTENT_TYPE } from "@/lib/accept";

import { GET, HEAD, generateStaticParams } from "./route";

describe("Node markdown corpus handler", () => {
  test("serves homepage, category, and recovery markdown", async () => {
    const history = await loadHistory();
    const openRouter = history.events.find(
      ({ id }) => id === "openrouter-acquisition-talks-reported",
    );
    const root = await GET(new Request("https://hraness.com/stripe/x-markdown"), {
      params: Promise.resolve({}),
    });
    const acquisitions = await GET(
      new Request("https://hraness.com/stripe/x-markdown/history/acquisitions"),
      { params: Promise.resolve({ path: ["history", "acquisitions"] }) },
    );
    const missing = await GET(
      new Request("https://hraness.com/stripe/x-markdown/this-does-not-exist"),
      { params: Promise.resolve({ path: ["this-does-not-exist"] }) },
    );
    const missingEvent = await GET(
      new Request(
        "https://hraness.com/stripe/x-markdown/history/acquisitions/openrouter-acquisition-talks-reported",
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
    const head = await HEAD(new Request("https://hraness.com/stripe/x-markdown"), {
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
    const missingBody = await missing.text();
    expect(missing.status).toBe(404);
    expect(missingBody).toContain("https://hraness.com/stripe/sitemap.xml");
    expect(missingBody).toContain("https://hraness.com/stripe/llms.txt");
    expect(missingEvent.status).toBe(404);
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("content-type")).toBe(MARKDOWN_CONTENT_TYPE);
  });

  test("prebuilds public document paths without per-event routes", async () => {
    const history = await loadHistory();
    const params = await generateStaticParams();
    expect(params).toContainEqual({ path: [] });
    expect(params).toContainEqual({ path: ["about"] });
    expect(params).toContainEqual({ path: ["history", "acquisitions"] });
    expect(params).toContainEqual({ path: ["history", "valuation"] });
    expect(params).not.toContainEqual({
      path: ["history", "acquisitions", "openrouter-acquisition-talks-reported"],
    });
    expect(params.length).toBe(8 + history.categories.length);
  });
});
