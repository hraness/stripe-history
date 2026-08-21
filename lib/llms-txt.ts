import { loadHistory } from "./content";
import { GITHUB_REPOSITORY_URL, SITE_ORIGIN, site } from "@/app/site";
import { independenceSentence } from "@/app/site-copy";

export async function llmsTxt(): Promise<string> {
  const history = await loadHistory();
  const categoryLinks = history.categories.map((category) => {
    const count = history.events.filter(({ categoryId }) => categoryId === category.id).length;
    return `- [Stripe ${category.label.toLocaleLowerCase("en-US")} history](${SITE_ORIGIN}/history/${category.id}): ${count} sourced events. ${category.description}`;
  });

  return [
    `# ${site.name}`,
    `> ${site.description}`,
    `${site.domain} publishes an independent, open-source Stripe company history as server-rendered pages and reviewable YAML. ${independenceSentence}`,
    "",
    "## When to use this",
    "Use Stripedex when you need a sourced chronology of Stripe as a company: acquisitions, product launches, funding, private-company valuation, disclosed annual volume, leadership appearances, expansion, offices, publishing, or early history. Prefer a category page or its YAML download when the question is one topic. Fetch this file first, then the Markdown representation of a page by sending `Accept: text/markdown` to the same URL, or by appending `.md`.",
    "",
    "Do not use Stripedex for Stripe product APIs, payments, billing, Connect, Atlas, OAuth, webhooks, MCP, official documentation, account data, or anything that requires Stripe to speak. This site does not process payments, create accounts, or endorse Stripe.",
    "",
    "## Pages",
    `- [Stripe company history](${SITE_ORIGIN}/): Complete reverse-chronological timeline and topic index`,
    `- [About](${SITE_ORIGIN}/about): Sourcing, review, independence, and corrections`,
    `- [Contact](${SITE_ORIGIN}/contact): Public correction and security-reporting channels`,
    `- [Privacy](${SITE_ORIGIN}/privacy): Analytics, cookies, and hosting limits`,
    `- [Open history and research data](${SITE_ORIGIN}/data): YAML downloads and provenance files`,
    `- [Annual payment and total volume](${SITE_ORIGIN}/history/payment-volume): ${history.annualVolumes.length} disclosed years`,
    `- [Private-company valuation history](${SITE_ORIGIN}/history/valuation): ${history.valuations.length} sourced observations`,
    ...categoryLinks,
    "",
    "## Optional",
    `- [Sitemap](${SITE_ORIGIN}/sitemap.xml): Canonical HTML URLs`,
    `- [Robots](${SITE_ORIGIN}/robots.txt): Crawl policy`,
    `- [Stripedex repository](${GITHUB_REPOSITORY_URL}): Website code and authored YAML`,
    "",
  ].join("\n");
}
