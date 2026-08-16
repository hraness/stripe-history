import sitemap from "../app/sitemap";
import { SITE_DOMAIN, SITE_ORIGIN } from "../app/site";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow" as const;
export const INDEXNOW_KEY = "8a9a85bffd29ef3deaa34c0893775cf2" as const;

export interface IndexNowPayload {
  readonly host: typeof SITE_DOMAIN;
  readonly key: typeof INDEXNOW_KEY;
  readonly keyLocation: `${typeof SITE_ORIGIN}/${typeof INDEXNOW_KEY}.txt`;
  readonly urlList: readonly string[];
}

export async function buildIndexNowPayload(): Promise<IndexNowPayload> {
  const urlList = (await sitemap()).map(({ url }) => url);
  const uniqueUrls = new Set(urlList);

  if (uniqueUrls.size !== urlList.length) {
    throw new Error("IndexNow URL list contains duplicate canonical URLs.");
  }
  for (const value of urlList) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== SITE_DOMAIN) {
      throw new Error(`IndexNow URL is outside ${SITE_ORIGIN}: ${value}`);
    }
  }

  return {
    host: SITE_DOMAIN,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
    urlList,
  };
}

async function main(): Promise<void> {
  const payload = await buildIndexNowPayload();
  if (!process.argv.includes("--submit")) {
    console.log(JSON.stringify(payload, null, 2));
    console.log("Dry run only. Pass --submit after the matching site is live.");
    return;
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json; charset=utf-8" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `IndexNow submission failed with HTTP ${response.status}: ${await response.text()}`,
    );
  }
  console.log(
    `IndexNow accepted ${payload.urlList.length} canonical URLs (HTTP ${response.status}).`,
  );
}

if (import.meta.main) await main();
