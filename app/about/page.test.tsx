import { describe, expect, test } from "bun:test";
import {
  loadHistory,
  loadResearchRuns,
  summarizeHistoryEvidence,
} from "@/lib/content";
import { renderToStaticMarkup } from "react-dom/server";

import AboutPage, { metadata } from "./page";

describe("hraness.com/stripe about page", () => {
  test("publishes a canonical editorial, evidence, and privacy explanation", async () => {
    const [history, researchRuns] = await Promise.all([
      loadHistory(),
      loadResearchRuns(),
    ]);
    const evidence = summarizeHistoryEvidence(history, researchRuns);
    const html = renderToStaticMarkup(await AboutPage());

    expect(metadata).toMatchObject({
      alternates: { canonical: "https://hraness.com/stripe/about" },
      title: "About",
    });
    expect(html).toContain("<h1 id=\"about-heading\">About hraness.com/stripe</h1>");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("not affiliated with, endorsed by, or operated by");
    expect(html).toContain("anonymous, cookieless pageview events for public pages");
    expect(html).toContain("normalized public page path, its page category, a site identifier");
    expect(html).toContain("referrer properties, account data, and user content");
    expect(html).toContain("does not save an analytics cookie or identifier");
    expect(html).toContain("does not use autocapture, session replay, heatmaps, surveys");
    expect(html).toContain("no local reader accounts or authentication");
    expect(html).toContain("mailing signup is handled by Hraness Accounts");
    expect(html).toContain("ordinary logs and security controls of the hosting provider");
    expect(html).toContain("founder side projects and aesthetics programs");
    expect(html).toContain('<h2 id="evidence-status">Evidence status</h2>');
    expect(html).toContain(`<dt>timeline entries</dt><dd>${evidence.eventCount}</dd>`);
    expect(html).toContain(`<dt>entry source links</dt><dd>${evidence.sourceLinkCount}</dd>`);
    expect(html).toContain(`<dt>canonical sources</dt><dd>${evidence.canonicalSourceCount}</dd>`);
    expect(html).toContain('id="sources-and-review"');
    expect(html).toContain("not a count of independently corroborated claims");
    expect(html).toContain("not a claim that the whole corpus was re-reviewed that day");
    expect(html).toContain('href="/stripe/research/sources.yml"');
    expect(html).toContain('href="/stripe/research/collections.yml"');
    expect(html).toContain('href="/stripe/research/runs.yml"');
    expect(html).toContain('href="/data">export the public YAML</a>');
    expect(html).toContain('href="/contact#corrections-and-sources"');
    expect(html).toContain("https://github.com/hraness/stripe-history/issues");
    expect(html).toContain("Publications followed");
    expect(html).toContain("href=\"https://www.stripeeconomics.com/\"");
    expect(html).toContain("href=\"https://worksinprogress.co/\"");
    expect(html).toContain("href=\"https://press.stripe.com/\"");
    expect(html).toContain("href=\"https://stripe.com/blog\"");
    expect(html).toContain("href=\"https://stripe.dev/blog\"");
    expect(html).toContain("href=\"https://podcasts.apple.com/us/podcast/cheeky-pint/id1821055332\"");
    expect(html).toContain("does not turn every newsletter essay into its own event");
    expect(html).toContain("timeline and its focused category views stay aligned");
    expect(html).toContain('aria-current="page" href="/about">about</a>');
    expect(html).toContain('aria-label="Appearance: System"');
    expect(html).toContain('href="https://hraness.com/"');
    expect(html).toContain('href="https://github.com/hraness/stripe-history"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/privacy"');
    expect(html).not.toContain("Atom feed");
    expect(html).not.toContain("news summaries");
    expect(html).toContain('type="application/ld+json"');
  });
});
