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
    expect(html).toContain("<h1 id=\"about-heading\">About Stripe History</h1>");
    expect(html).toContain("gathers those pieces into one dated record");
    expect(html).toContain('<h2 id="other-stripe-references">Other Stripe references</h2>');
    expect(html).toContain('Checked September 28, 2026. <a href="https://en.wikipedia.org/wiki/Stripe,_Inc.">Wikipedia</a> is better for a short overview');
    expect(html).toContain('<a href="https://sacra.com/c/stripe/">Sacra</a> analyze the business, and Sacra publishes revenue estimates.');
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("not affiliated with, endorsed by, or operated by");
    expect(html).toContain("anonymous, cookieless pageview events for public pages");
    expect(html).toContain("normalized public page path, its page category, a site identifier");
    expect(html).toContain("never the full referring address");
    expect(html).toContain("does not save an analytics cookie or identifier");
    expect(html).toContain("does not use autocapture, session replay, heatmaps, surveys");
    expect(html).toContain("no local reader accounts or authentication");
    expect(html).toContain("general Hraness newsletter and optional support");
    expect(html).toContain("does not create a separate product newsletter subscription");
    expect(html).toContain("ordinary logs and security controls of the hosting provider");
    expect(html).toContain("the founders&#x27; projects outside Stripe");
    expect(html).toContain('<h2 id="evidence-status">Evidence status</h2>');
    expect(html).toContain(`<dt>timeline entries</dt><dd>${evidence.eventCount}</dd>`);
    expect(html).toContain(`<dt>citations</dt><dd>${evidence.sourceLinkCount}</dd>`);
    expect(html).toContain(`<dt>sources</dt><dd>${evidence.canonicalSourceCount}</dd>`);
    expect(html).toContain(`<dt>last research run</dt><dd><time dateTime="${evidence.latestCompletedResearchRunOn}">`);
    expect(html).toContain('id="sources-and-review"');
    expect(html).toContain('href="https://en.wikipedia.org/wiki/Stripe,_Inc."');
    expect(html).toContain('href="https://sacra.com/c/stripe/"');
    expect(html).toContain('href="/data">downloads as YAML</a>');
    expect(html).toContain('<a href="#other-stripe-references">Other Stripe references</a> lists');
    expect(html.match(/href="https:\/\/sacra\.com\/c\/stripe\/"/g)).toHaveLength(1);
    expect(html).toContain("not a count of independently corroborated claims");
    expect(html).toContain("Each run covers one research collection, not the whole timeline.");
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
    expect(html).toMatch(/aria-current="page" class="hraness-marketing-header__link [^"]+" href="\/stripe\/about">about<\/a>/u);
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
