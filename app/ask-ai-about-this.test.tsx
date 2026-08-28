import { expect, test } from "bun:test";
import { timelineCategoryIds } from "@/lib/history-schema";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import AboutPage from "./about/page";
import ContactPage from "./contact/page";
import DataPage from "./data/page";
import HistoryCategoryPage from "./history/[category]/page";
import NetRevenuePage from "./history/net-revenue/page";
import PaymentVolumePage from "./history/payment-volume/page";
import ValuationPage from "./history/valuation/page";
import NotFound from "./not-found";
import Home from "./page";
import PrivacyPage from "./privacy/page";
import { absoluteSiteUrl, type SitePath } from "./site";

type PageRender = () => ReactNode | Promise<ReactNode>;

const providerHosts = [
  "chatgpt.com",
  "claude.ai",
  "perplexity.ai",
  "x.com",
] as const;

const canonicalPages: readonly Readonly<{
  path: SitePath;
  render: PageRender;
}>[] = [
  { path: "/", render: Home },
  { path: "/about", render: AboutPage },
  { path: "/contact", render: ContactPage },
  { path: "/data", render: DataPage },
  { path: "/privacy", render: PrivacyPage },
  { path: "/history/payment-volume", render: PaymentVolumePage },
  { path: "/history/net-revenue", render: NetRevenuePage },
  { path: "/history/valuation", render: ValuationPage },
  ...timelineCategoryIds.map((category) => ({
    path: `/history/${category}` as const,
    render: () => HistoryCategoryPage({
      params: Promise.resolve({ category }),
    }),
  })),
];

function askAiNav(html: string): string {
  const match = /<nav\b[^>]*aria-label="Ask AI about this"[^>]*>[\s\S]*?<\/nav>/u.exec(html);
  expect(match).not.toBeNull();
  return match?.[0] ?? "";
}

function assertAskAiLinks(html: string, path: SitePath): void {
  const nav = askAiNav(html);
  const expectedSubject = absoluteSiteUrl(path);
  const anchors = [...nav.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gu)];

  expect(nav).toContain(">Ask AI about this<");
  expect(nav).not.toContain("data-analytics-");
  expect(anchors).toHaveLength(providerHosts.length);

  for (const [index, anchor] of anchors.entries()) {
    const expectedHost = providerHosts[index];
    const tag = anchor[0];
    const href = anchor[1];
    if (expectedHost === undefined || href === undefined) {
      throw new Error("Ask AI anchor does not match the provider contract");
    }
    const destination = new URL(href.replaceAll("&amp;", "&"));
    const prompt = destination.searchParams.get("q")
      ?? destination.searchParams.get("text");

    expect(destination.protocol).toBe("https:");
    expect(destination.hostname).toBe(expectedHost);
    expect(prompt).toBe(`Tell me about ${expectedSubject}`);
    expect(prompt).toContain("https://");
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer nofollow"');
  }
}

test("server-renders exact Ask AI subjects on every canonical HTML page", async () => {
  expect(canonicalPages).toHaveLength(20);

  for (const page of canonicalPages) {
    const html = renderToStaticMarkup(await page.render());
    assertAskAiLinks(html, page.path);
  }
});

test("keeps the Ask AI block off the not-found surface", () => {
  const html = renderToStaticMarkup(<NotFound />);

  expect(html).not.toContain('aria-label="Ask AI about this"');
  expect(html).not.toContain(">Ask AI about this<");
});
