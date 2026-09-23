import {
  absoluteSiteUrl,
  GITHUB_REPOSITORY_URL,
  HRANESS_URL,
  SITE_ORIGIN,
  site,
} from "./site";

export const notFoundTitle = "Page not found";
export const notFoundDescription = "The requested Stripe history page does not exist.";

export const aboutTitle = "About";
export const aboutSocialTitle = `About ${site.domain}`;
export const aboutDescription =
  `How ${site.domain} selects, summarizes, sources, reviews, corrects, and measures its independent Stripe company history.`;

export const privacyTitle = "Privacy";
export const privacySocialTitle = `Privacy | ${site.domain}`;
export const privacyDescription =
  `How ${site.domain} handles analytics, cookies, the Hraness newsletter, optional support, historical mailing consent, and hosting logs for the independent Stripe company history.`;

export const contactTitle = "Contact";
export const contactSocialTitle = `Contact ${site.domain}`;
export const contactDescription =
  `How to send a correction, source, or security report for the independent Stripe company history at ${site.domain}.`;

export const dataTitle = "Stripe company history dataset";

function sourcedEventCount(eventCount: number): string {
  return `${eventCount} sourced ${eventCount === 1 ? "event" : "events"}`;
}

export function historyPageTitle(eventCount: number): string {
  return `${site.historyTitle}: ${sourcedEventCount(eventCount)}`;
}

export function historyCategoryHeading(label: string): string {
  return `Stripe ${label.toLocaleLowerCase("en-US")} history`;
}

export function historyCategoryTitle(label: string, eventCount: number): string {
  return `${historyCategoryHeading(label)}: ${sourcedEventCount(eventCount)}`;
}

export const evidenceLabels = {
  canonicalSourceCount: "Sources",
  eventCount: "Timeline entries",
  latestCompletedResearchRunOn: "Last research run",
  sourceLinkCount: "Citations",
} as const;

export const researchRunNote =
  "The date of the most recent completed research run. Each run covers one research collection, such as founder appearances or valuation history, not the whole timeline.";

export const independenceSentence =
  `${site.domain} is not affiliated with, endorsed by, or operated by Stripe, Inc. Stripe names and trademarks belong to their respective owners.`;

export const recoveryLinks = [
  { href: absoluteSiteUrl("/"), label: "Stripe company history" },
  { href: `${SITE_ORIGIN}/llms.txt`, label: "Agent index (llms.txt)" },
  { href: `${SITE_ORIGIN}/sitemap.xml`, label: "Sitemap" },
  { href: `${SITE_ORIGIN}/about`, label: "About" },
  { href: `${SITE_ORIGIN}/data`, label: "Open history and research data" },
  { href: `${SITE_ORIGIN}/contact`, label: "Contact" },
  { href: `${SITE_ORIGIN}/privacy`, label: "Privacy" },
] as const;

export const aboutSections = [
  {
    heading: "Stripe company history",
    paragraphs: [
      `${site.domain} is an independent, sourced guide to Stripe. It publishes a reverse-chronological company timeline covering acquisitions, products, leadership, funding, valuation, expansion, offices, publishing projects, the founders' projects outside Stripe such as grant programs, early history, annual volume, sourced annual net-revenue disclosures, and reviewed long-form appearances by Stripe founders and senior leaders.`,
    ],
  },
  {
    heading: "Sources and review",
    paragraphs: [
      "Every history entry resolves to at least one cataloged source. Review prefers primary material and filings, uses strong contemporaneous reporting where necessary, checks chronology, category placement, source support, and duplicate claims, and preserves uncertainty when a transaction or event was only proposed or reported.",
      `“Citations” counts each link between a timeline entry and a source in the catalog. It is not a count of independently corroborated claims: one source can support more than one entry, and one entry can cite more than one source. The [source catalog](${SITE_ORIGIN}/research/sources.yml) lists every source.`,
      `“Last research run” is the date of the most recent completed research run. Each run covers one research collection, not the whole timeline. The [collection definitions](${SITE_ORIGIN}/research/collections.yml) and the [research-run log](${SITE_ORIGIN}/research/runs.yml), both YAML, show what each run covered.`,
    ],
  },
  {
    heading: "Publications followed",
    paragraphs: [
      "Weekly discovery reads first-party and Stripe-affiliated publication feeds. The timeline records those publications when they become part of Stripe's editorial history. It does not turn every newsletter essay into its own event.",
      `Followed publications include [Stripe Economics](https://www.stripeeconomics.com/), [Works in Progress](https://worksinprogress.co/), and [Stripe Press](https://press.stripe.com/). Discovery also reads first-party [Stripe Blog](https://stripe.com/blog) and [Stripe.dev Blog](https://stripe.dev/blog) RSS, and the [Cheeky Pint](https://podcasts.apple.com/us/podcast/cheeky-pint/id1821055332) episode feed.`,
    ],
  },
  {
    heading: "Independence and corrections",
    paragraphs: [
      `${independenceSentence} Corrections are made in the underlying sourced records so the timeline and its focused category views stay aligned.`,
      `To inspect or reuse the current record, [export the public YAML](${SITE_ORIGIN}/data). To challenge a date, claim, status, or source, use the [public issue tracker](${GITHUB_REPOSITORY_URL}/issues) and include the affected entry, proposed correction, and supporting source. The [contact page](${SITE_ORIGIN}/contact#corrections-and-sources) keeps those requirements easy to find.`,
    ],
  },
  {
    heading: "Publisher and contributions",
    paragraphs: [
      `Published and maintained by [Hraness](${HRANESS_URL}). To suggest a correction, add a source, or improve the project, open an issue or contribution in the [Stripe History repository](${GITHUB_REPOSITORY_URL}). Use the [contact page](${SITE_ORIGIN}/contact) for the same public channels.`,
    ],
  },
] as const;

export const privacyParagraphs = [
  `The site sends anonymous, cookieless pageview events for public pages to PostHog. Each event contains the normalized public page path, its page category, a site identifier, an analytics schema version, and PostHog's cookieless marker. It excludes query strings, URL fragments, referrer properties, account data, and user content. The browser does not save an analytics cookie or identifier.`,
  `The PostHog integration does not use autocapture, session replay, heatmaps, surveys, feature flags, performance monitoring, or user profiles. The site has no local reader accounts or authentication. Requests are still subject to the ordinary logs and security controls of the hosting provider.`,
  `The footer offers the general Hraness newsletter. Before submission, it may contact [Hraness Accounts](https://account.hraness.com) for anonymous form presentation and measurement. These requests send the list choice, language, compact or wide viewport category, and presentation version, then an opaque token when the form becomes visible. They omit account credentials and do not send your email address. If you submit the form, your email address, the Hraness list choice, form source, and any presentation token are sent to Accounts. Accounts records dated consent, and Resend sends confirmation and subscribed messages from news.hraness.com. You are not subscribed until you confirm. Each newsletter message has a Hraness-specific unsubscribe link that does not change another product subscription. Optional paid support opens Accounts separately, where you review the plan and price before confirming payment.`,
  `This general newsletter signup does not create new Stripe History mailing consent. If you subscribed through the earlier Stripe History form, Hraness Accounts retains that dated record. A previously confirmed membership may remain active, and Hraness Accounts may continue to process it and deliver Stripe History newsletter messages through Resend from news.hraness.com until you use its Stripe-History-specific unsubscribe link. That link does not change another product or general Hraness subscription. Removing the earlier form does not delete, cancel, or migrate that record.`,
  `${site.domain} does not sell personal data, does not run advertising pixels, and does not keep a reader profile. Appearance preferences stay in the browser. Machine-readable copies of the public pages are available as Markdown when a client sends \`Accept: text/markdown\`, and the authored YAML records remain downloadable from the [dataset index](${SITE_ORIGIN}/data).`,
  `Questions about this policy belong on the [contact page](${SITE_ORIGIN}/contact) or in the [Stripe History repository](${GITHUB_REPOSITORY_URL}). The broader sourcing and independence statement lives on the [about page](${SITE_ORIGIN}/about).`,
] as const;

export const contactParagraphs = [
  `Use public GitHub issues for ordinary historical corrections, missing events, stronger sources, and focused software improvements. Include the event date, a concise factual claim, its category, the proposed confidence and status, and at least one source URL. Prefer primary sources. If a claim was only proposed or reported, keep that uncertainty in the record.`,
  `Report suspected vulnerabilities through GitHub's private vulnerability reporting for this repository. Do not include sensitive details in a public issue.`,
  `There is no Stripe History-owned reader login, contact form, product inbox, or new product-specific mailing signup on ${site.domain}. The footer offers the general Hraness newsletter and optional support described on the privacy page. The project does not process payments, issue API keys, or operate a Stripe integration. ${independenceSentence}`,
  `Published and maintained by [Hraness](${HRANESS_URL}). The complete sourced records and website code are in the [Stripe History repository](${GITHUB_REPOSITORY_URL}). Read [about](${SITE_ORIGIN}/about) for editorial method and [privacy](${SITE_ORIGIN}/privacy) for analytics, the Hraness newsletter, and historical mailing-consent limits.`,
] as const;

export const dataIntro =
  "These YAML files hold the data behind the timeline and the valuation, volume, and revenue pages. Each history entry has a date, title, category, summary, confidence level, and at least one source, plus a status where one applies. The research files hold the source catalog, valuation observations, leadership appearances, the definition of each research collection, and the log of research runs.";
