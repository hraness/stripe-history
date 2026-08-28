import {
  MARKDOWN_CONTENT_TYPE,
} from "./accept";
import {
  aboutDescription,
  aboutSections,
  aboutSocialTitle,
  contactDescription,
  contactParagraphs,
  contactTitle,
  dataIntro,
  dataTitle,
  independenceSentence,
  notFoundDescription,
  notFoundTitle,
  privacyDescription,
  privacyParagraphs,
  privacyTitle,
  recoveryLinks,
} from "@/app/site-copy";
import {
  absoluteSiteUrl,
  GITHUB_REPOSITORY_URL,
  SITE_ORIGIN,
  site,
} from "@/app/site";
import {
  derivePaymentVolumeDisclosures,
  derivePaymentVolumePageSeo,
  derivePaymentVolumeRecords,
} from "@/app/history/payment-volume/payment-volume-page-model";
import {
  deriveValuationHeadlineRows,
  deriveValuationPageSeo,
} from "@/app/history/valuation/valuation-page-model";
import {
  loadHistory,
  type CategorizedHistoryEvent,
  type HistoryCollection,
} from "./content";
import { timelineCategoryIds, type TimelineCategoryId } from "./history-schema";
import { llmsTxt } from "./llms-txt";

export { MARKDOWN_CONTENT_TYPE, NOT_ACCEPTABLE_BODY } from "./accept";

export interface MarkdownDocument {
  readonly body: string;
  readonly status: 200 | 404;
}

const KNOWN_STATIC_PATHS = new Set([
  "/",
  "/about",
  "/contact",
  "/data",
  "/history",
  "/llms.txt",
  "/privacy",
  "/history/payment-volume",
  "/history/valuation",
]);

function normalizePathname(pathname: string): string {
  if (pathname === "" || pathname === "/") return "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;
}

function heading(title: string, description: string): string {
  return `# ${title}\n\n> ${description}\n`;
}

function linkList(
  items: readonly Readonly<{ href: string; label: string; note?: string }>[],
): string {
  return items.map((item) => (
    item.note === undefined
      ? `- [${item.label}](${item.href})`
      : `- [${item.label}](${item.href}): ${item.note}`
  )).join("\n");
}

function eventMarkdown(event: CategorizedHistoryEvent): string {
  const facts = [
    event.amount === undefined ? undefined : `amount: ${event.amount.display}`,
    ...(event.metrics ?? []).map((metric) => (
      metric.context === undefined
        ? `${metric.label}: ${metric.value}`
        : `${metric.label}: ${metric.value} · ${metric.context}`
    )),
    ...(event.details ?? []).map((detail) => `${detail.label}: ${detail.value}`),
  ].filter((value): value is string => value !== undefined);
  const sources = event.sources.map((source) => `[${source.publisher}](${source.url})`).join(" · ");
  const status = [
    event.status,
    event.confidence === "confirmed" ? undefined : event.confidence,
  ].filter((value): value is string => value !== undefined).join(" · ");
  return [
    `### ${event.title}`,
    "",
    status === "" ? event.date : `${event.date} · ${status}`,
    "",
    event.summary,
    ...(facts.length === 0 ? [] : ["", facts.join("  \n")]),
    "",
    `Sources: ${sources}`,
    "",
  ].join("\n");
}

function historyIndexMarkdown(history: HistoryCollection): string {
  const categoryLinks = history.categories.map((category) => {
    const count = history.events.filter(({ categoryId }) => categoryId === category.id).length;
    return {
      href: `${SITE_ORIGIN}/history/${category.id}`,
      label: `Stripe ${category.label.toLocaleLowerCase("en-US")} history`,
      note: `${count} sourced events. ${category.description}`,
    };
  });
  return [
    heading(
      `${site.historyTitle}: ${history.events.length} Sourced Events`,
      site.description,
    ),
    independenceSentence,
    "",
    `This Markdown index covers the same ${history.events.length} sourced events as the HTML timeline. Category, annual-volume, and valuation pages repeat those records in a narrower view.`,
    "",
    "## Browse by topic",
    "",
    linkList([
      ...categoryLinks,
      {
        href: `${SITE_ORIGIN}/history/payment-volume`,
        label: "Annual payment and total volume",
        note: `${history.annualVolumes.length} disclosed years`,
      },
      {
        href: `${SITE_ORIGIN}/history/valuation`,
        label: "Private-company valuation history",
        note: `${history.valuations.length} sourced observations`,
      },
      {
        href: `${SITE_ORIGIN}/data`,
        label: "Open history and research data",
        note: "Downloadable YAML with source provenance",
      },
    ]),
    "",
    "## Agent index",
    "",
    linkList(recoveryLinks.filter(({ href }) => href !== absoluteSiteUrl("/"))),
    "",
  ].join("\n");
}

function aboutMarkdown(): string {
  return [
    heading(aboutSocialTitle, aboutDescription),
    ...aboutSections.flatMap((section) => [
      `## ${section.heading}`,
      "",
      ...section.paragraphs,
      "",
    ]),
    "## Privacy",
    "",
    ...privacyParagraphs.slice(0, 2),
    "",
    `The dedicated [privacy page](${SITE_ORIGIN}/privacy) repeats this policy.`,
    "",
  ].join("\n");
}

function privacyMarkdown(): string {
  return [
    heading(`${privacyTitle} | ${site.domain}`, privacyDescription),
    ...privacyParagraphs,
    "",
  ].join("\n");
}

function contactMarkdown(): string {
  return [
    heading(`${contactTitle} ${site.domain}`, contactDescription),
    ...contactParagraphs,
    "",
  ].join("\n");
}

function dataMarkdown(history: HistoryCollection): string {
  return [
    heading(dataTitle, site.datasetDescription),
    dataIntro,
    "",
    `The dataset and website code are available under the MIT License in the [Stripe History repository](${GITHUB_REPOSITORY_URL}).`,
    "",
    "## History files",
    "",
    linkList(history.categories.map((category) => ({
      href: category.id === "appearances"
        ? `${SITE_ORIGIN}/research/appearances.yml`
        : `${SITE_ORIGIN}/history/${category.id}.yml`,
      label: `${category.label} YAML`,
      note: category.description,
    }))),
    "",
    "## Publications followed",
    "",
    "Weekly discovery reads first-party and Stripe-affiliated publication feeds. The timeline records those publications when they become part of Stripe's editorial history. It does not turn every newsletter essay into its own event.",
    "",
    linkList([
      { href: "https://www.stripeeconomics.com/", label: "Stripe Economics" },
      { href: "https://worksinprogress.co/", label: "Works in Progress" },
      { href: "https://press.stripe.com/", label: "Stripe Press" },
      { href: "https://stripe.com/blog", label: "Stripe Blog" },
      { href: "https://stripe.dev/blog", label: "Stripe.dev Blog" },
      {
        href: "https://podcasts.apple.com/us/podcast/cheeky-pint/id1821055332",
        label: "Cheeky Pint",
      },
      {
        href: `${SITE_ORIGIN}/history/publishing`,
        label: "Publishing history",
        note: "Sourced book, magazine, film, podcast, and newsletter events",
      },
    ]),
    "",
    "## Research files",
    "",
    linkList([
      {
        href: `${SITE_ORIGIN}/research/sources.yml`,
        label: "Source catalog YAML",
        note: `${history.sources.length} canonical sources`,
      },
      {
        href: `${SITE_ORIGIN}/research/valuations.yml`,
        label: "Valuation observations YAML",
        note: `${history.valuations.length} observations`,
      },
      {
        href: `${SITE_ORIGIN}/research/collections.yml`,
        label: "Research collections YAML",
      },
      {
        href: `${SITE_ORIGIN}/research/runs.yml`,
        label: "Research run ledger YAML",
      },
    ]),
    "",
  ].join("\n");
}

function categoryMarkdown(
  history: HistoryCollection,
  categoryId: TimelineCategoryId,
): string | null {
  const category = history.categories.find(({ id }) => id === categoryId);
  if (category === undefined) return null;
  const events = history.events.filter(({ categoryId: id }) => id === categoryId);
  return [
    heading(
      `Stripe ${category.label} Timeline: ${events.length} Sourced Events`,
      category.description,
    ),
    ...events.flatMap((event) => [eventMarkdown(event)]),
  ].join("\n");
}

function paymentVolumeMarkdown(history: HistoryCollection): string {
  const seo = derivePaymentVolumePageSeo(history);
  const rows = derivePaymentVolumeRecords(history);
  const table = [
    "| year | volume | kind | qualifier | sources |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(({ event, kindLabel, point, qualifierLabel }) => {
      const sources = event.sources
        .map((source) => `[${source.publisher}](${source.url})`)
        .join(" · ");
      return `| ${point.calendarYear} | ${markdownTableCell(point.display)} | ${markdownTableCell(kindLabel)} | ${markdownTableCell(qualifierLabel)} | ${markdownTableCell(sources)} |`;
    }),
  ];
  return [
    heading(seo.title, seo.description),
    seo.lead,
    "",
    "## Yearly disclosures",
    "",
    ...table,
    "",
    "## Disclosures and sources",
    "",
    ...derivePaymentVolumeDisclosures(history).map(({ event, kindLabel, qualifierLabel }) => {
      const sources = event.sources
        .map((source) => `[${source.publisher}](${source.url})`)
        .join(" · ");
      return [
        `### ${event.title}`,
        "",
        `${event.date} · ${kindLabel} · ${qualifierLabel}`,
        "",
        event.summary,
        "",
        `Sources: ${sources}`,
        "",
      ].join("\n");
    }),
    "## Method",
    "",
    seo.method,
    "",
  ].join("\n");
}

function markdownTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function valuationMarkdown(history: HistoryCollection): string {
  const seo = deriveValuationPageSeo(history);
  const rows = deriveValuationHeadlineRows(history);
  const table = [
    "| year | valuation | basis | status | sources |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map((row) => {
      const sources = row.sources
        .map((source) => `[${source.publisher}](${source.url})`)
        .join(" · ");
      return `| ${row.calendarYear} | ${markdownTableCell(row.display)} | ${markdownTableCell(row.basisLabel)} | ${markdownTableCell(row.statusLabel)} | ${markdownTableCell(sources)} |`;
    }),
  ];
  return [
    heading(seo.title, seo.description),
    seo.lead,
    "",
    "## Yearly headlines",
    "",
    ...table,
    "",
    "## Observations and sources",
    "",
    ...history.valuations.map((observation) => {
      const sources = observation.sources.map((source) => `[${source.publisher}](${source.url})`).join(" · ");
      return [
        `### ${observation.title}`,
        "",
        `${observation.effective_date} · ${observation.status} · ${observation.valuation.basis}`,
        "",
        `Sources: ${sources}`,
        "",
      ].join("\n");
    }),
  ].join("\n");
}

export function notFoundMarkdown(): string {
  return [
    heading(notFoundTitle, notFoundDescription),
    "Continue from:",
    "",
    linkList(recoveryLinks),
    "",
  ].join("\n");
}

export async function markdownForPath(pathname: string): Promise<MarkdownDocument> {
  const path = normalizePathname(pathname);
  if (path === "/llms.txt") {
    return { body: await llmsTxt(), status: 200 };
  }

  const history = await loadHistory();
  if (path === "/" || path === "/history") {
    return { body: historyIndexMarkdown(history), status: 200 };
  }
  if (path === "/about") return { body: aboutMarkdown(), status: 200 };
  if (path === "/privacy") return { body: privacyMarkdown(), status: 200 };
  if (path === "/contact") return { body: contactMarkdown(), status: 200 };
  if (path === "/data") return { body: dataMarkdown(history), status: 200 };
  if (path === "/history/payment-volume") {
    return { body: paymentVolumeMarkdown(history), status: 200 };
  }
  if (path === "/history/valuation") {
    return { body: valuationMarkdown(history), status: 200 };
  }
  if (path.startsWith("/history/")) {
    const categoryId = path.slice("/history/".length);
    if (timelineCategoryIds.includes(categoryId as TimelineCategoryId)) {
      const body = categoryMarkdown(history, categoryId as TimelineCategoryId);
      if (body !== null) return { body, status: 200 };
    }
  }

  if (!KNOWN_STATIC_PATHS.has(path) && !path.startsWith("/history/")) {
    return { body: notFoundMarkdown(), status: 404 };
  }
  return { body: notFoundMarkdown(), status: 404 };
}

export function markdownHeaders(): Headers {
  return new Headers({
    "Content-Type": MARKDOWN_CONTENT_TYPE,
    Vary: "Accept",
  });
}
