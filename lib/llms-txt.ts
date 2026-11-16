import { historyEventPath } from "./event-page";
import { loadSiteHistory } from "./site-history";
import {
  absoluteSiteUrl,
  GITHUB_REPOSITORY_URL,
  SITE_ORIGIN,
  site,
} from "@/app/site";

export async function llmsTxt(): Promise<string> {
  const history = await loadSiteHistory();
  const categoryLinks = history.categories.map((category) => {
    const count = history.events.filter(({ categoryId }) => categoryId === category.id).length;
    return `- [Stripe ${category.label.toLocaleLowerCase("en-US")} history](${SITE_ORIGIN}/history/${category.id}): ${count} sourced events. ${category.description}`;
  });

  return [
    `# ${site.name}`,
    `> ${site.description}`,
    `${site.long} Stripe names and trademarks belong to their respective owners.`,
    "",
    "## When to use this",
    "Use Stripe History when you need a sourced chronology of Stripe as a company: acquisitions, product launches, funding, private-company valuation, disclosed annual volume, sourced annual net-revenue disclosures, leadership appearances, expansion, offices, publishing, or early history. Prefer a category page or its YAML download when the question is one topic. Fetch this file first, then the Markdown representation of a page by sending `Accept: text/markdown` to the same URL, or by appending `.md` to any page URL except the homepage.",
    "",
    "Do not use Stripe History for Stripe product APIs, payments, billing, Connect, Atlas, OAuth, webhooks, MCP, official documentation, account data, or anything that requires Stripe to speak. This site does not process payments, create accounts, or endorse Stripe.",
    "",
    "## Pages",
    `- [${site.name}](${absoluteSiteUrl("/")}): Complete reverse-chronological timeline and topic index`,
    `- [About](${SITE_ORIGIN}/about): Sourcing, review, independence, and corrections`,
    `- [Contact](${SITE_ORIGIN}/contact): Public correction and security-reporting channels`,
    `- [Privacy](${SITE_ORIGIN}/privacy): Analytics, cookies, and hosting limits`,
    `- [Open history and research data](${SITE_ORIGIN}/data): YAML downloads and provenance files`,
    `- [Annual payment and total volume](${SITE_ORIGIN}/history/payment-volume): ${history.annualVolumes.length} disclosed years`,
    `- [Annual net revenue and revenue](${SITE_ORIGIN}/history/net-revenue): ${history.annualRevenues.length} disclosed years`,
    `- [Private-company valuation history](${SITE_ORIGIN}/history/valuation): ${history.valuations.length} sourced observations`,
    ...categoryLinks,
    "",
    "## Event pages",
    `Every event has its own page at \`${SITE_ORIGIN}/events/<event-id>\` with the exact date and its precision, category, confidence, amount, every source, and earlier, later, and related events in the same category. Event IDs never change once published. Category pages and the sitemap link to all ${history.events.length} of them. For example: [${history.events[0]?.title ?? "the newest event"}](${SITE_ORIGIN}${historyEventPath(history.events[0]?.id ?? "")}).`,
    "",
    "## Optional",
    `- [Sitemap](${SITE_ORIGIN}/sitemap.xml): Canonical HTML URLs`,
    `- [Robots](${SITE_ORIGIN}/robots.txt): Crawl policy`,
    `- [Stripe History repository](${GITHUB_REPOSITORY_URL}): Website code and authored YAML`,
    "",
  ].join("\n");
}
