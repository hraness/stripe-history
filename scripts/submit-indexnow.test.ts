import { describe, expect, test } from "bun:test";

import sitemap from "../app/sitemap";
import { SITE_DOMAIN, SITE_ORIGIN } from "../app/site";
import {
  buildIndexNowPayload,
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
} from "./submit-indexnow";

describe("IndexNow discovery notification", () => {
  test("hosts a valid verification key at the canonical site root", async () => {
    expect(INDEXNOW_KEY).toMatch(/^[A-Fa-f0-9-]{8,128}$/u);
    expect(
      await Bun.file(`public/${INDEXNOW_KEY}.txt`).text(),
    ).toBe(`${INDEXNOW_KEY}\n`);
  });

  test("submits exactly the canonical indexable sitemap URLs", async () => {
    const payload = await buildIndexNowPayload();
    const sitemapUrls = (await sitemap()).map(({ url }) => url);

    expect(INDEXNOW_ENDPOINT).toBe("https://api.indexnow.org/indexnow");
    expect(payload).toEqual({
      host: SITE_DOMAIN,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
      urlList: sitemapUrls,
    });
    expect(new Set(payload.urlList).size).toBe(payload.urlList.length);
    expect(payload.urlList).toContain(`${SITE_ORIGIN}/`);
    expect(payload.urlList.every((url) => url.startsWith(`${SITE_ORIGIN}/`))).toBe(
      true,
    );
    expect(payload.urlList.some((url) => url.endsWith(".yml"))).toBe(false);
  });
});
