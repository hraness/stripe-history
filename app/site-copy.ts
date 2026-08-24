import { GITHUB_REPOSITORY_URL, HRANESS_URL, SITE_ORIGIN, site } from "./site";

export const notFoundTitle = "Page not found";
export const notFoundDescription = "The requested Stripe history page does not exist.";

export const aboutTitle = "About";
export const aboutSocialTitle = `About ${site.domain}`;
export const aboutDescription =
  `How ${site.domain} selects, summarizes, sources, reviews, corrects, and measures its independent Stripe company history.`;

export const privacyTitle = "Privacy";
export const privacySocialTitle = `Privacy | ${site.domain}`;
export const privacyDescription =
  `How ${site.domain} handles analytics, cookies, accounts, and hosting logs for the independent Stripe company history.`;

export const contactTitle = "Contact";
export const contactSocialTitle = `Contact ${site.domain}`;
export const contactDescription =
  `How to send a correction, source, or security report for the independent Stripe company history at ${site.domain}.`;

export const dataTitle = "Stripe Company History Dataset";

export const independenceSentence =
  `${site.domain} is not affiliated with, endorsed by, or operated by Stripe, Inc. Stripe names and trademarks belong to their respective owners.`;

export const recoveryLinks = [
  { href: `${SITE_ORIGIN}/`, label: "Stripe company history" },
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
      `${site.domain} is an independent, sourced guide to Stripe. It publishes a reverse-chronological company timeline covering acquisitions, products, leadership, funding, valuation, expansion, offices, publishing projects, founder side projects and aesthetics programs, early history, annual volume, and reviewed long-form appearances by Stripe founders and senior leaders.`,
    ],
  },
  {
    heading: "Sources and review",
    paragraphs: [
      "History entries link to primary sources or strong contemporaneous reporting. Editorial review checks chronology, source support, category placement, and duplicate claims, and preserves uncertainty when a transaction or event was only proposed or reported.",
    ],
  },
  {
    heading: "Independence and corrections",
    paragraphs: [
      `${independenceSentence} Corrections are made in the underlying sourced records so the timeline and its focused category views stay aligned.`,
    ],
  },
  {
    heading: "Publisher and contributions",
    paragraphs: [
      `Published and maintained by [Hraness](${HRANESS_URL}). To suggest a correction, add a source, or improve the project, open an issue or contribution in the [Stripedex repository](${GITHUB_REPOSITORY_URL}). Use the [contact page](${SITE_ORIGIN}/contact) for the same public channels.`,
    ],
  },
] as const;

export const privacyParagraphs = [
  `The site sends anonymous, cookieless pageview events for public pages to PostHog. Each event contains the normalized public page path, its page category, a site identifier, an analytics schema version, and PostHog's cookieless marker. It excludes query strings, URL fragments, referrer properties, account data, and user content. The browser does not save an analytics cookie or identifier.`,
  `The site does not use autocapture, session replay, heatmaps, surveys, feature flags, performance monitoring, or user profiles, and it has no user accounts or authentication. Requests are still subject to the ordinary logs and security controls of the hosting provider.`,
  `${site.domain} does not sell personal data, does not run advertising pixels, and does not keep a reader profile. Appearance preferences stay in the browser. Machine-readable copies of the public pages are available as Markdown when a client sends \`Accept: text/markdown\`, and the authored YAML records remain downloadable from the [dataset index](${SITE_ORIGIN}/data).`,
  `Questions about this policy belong on the [contact page](${SITE_ORIGIN}/contact) or in the [Stripedex repository](${GITHUB_REPOSITORY_URL}). The broader sourcing and independence statement lives on the [about page](${SITE_ORIGIN}/about).`,
] as const;

export const contactParagraphs = [
  `Use public GitHub issues for ordinary historical corrections, missing events, stronger sources, and focused software improvements. Include the event date, a concise factual claim, its category, the proposed confidence and status, and at least one source URL. Prefer primary sources. If a claim was only proposed or reported, keep that uncertainty in the record.`,
  `Report suspected vulnerabilities through GitHub's private vulnerability reporting for this repository. Do not include sensitive details in a public issue.`,
  `There is no reader account, contact form, or product inbox on ${site.domain}. The project does not process payments, issue API keys, or operate a Stripe integration. ${independenceSentence}`,
  `Published and maintained by [Hraness](${HRANESS_URL}). The complete sourced records and website code are in the [Stripedex repository](${GITHUB_REPOSITORY_URL}). Read [about](${SITE_ORIGIN}/about) for editorial method and [privacy](${SITE_ORIGIN}/privacy) for analytics limits.`,
] as const;

export const dataIntro =
  "These reviewable YAML files power the public timeline and valuation record. History entries preserve chronology, category, summary, confidence, and status when applicable; the research files preserve canonical source identities, valuation observations, leadership appearances, collection scope, and review runs.";
