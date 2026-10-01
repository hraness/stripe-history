import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import {
  loadHistory,
  loadResearchRuns,
  summarizeHistoryEvidence,
} from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";

import { EditorialParagraph } from "../editorial-paragraph";
import { EvidenceSnapshot } from "../evidence-snapshot";
import { aboutPageJsonLd, breadcrumbJsonLd } from "../seo";
import { SiteHeader } from "../site-header";
import { SiteFooter } from "../site-footer";
import {
  GITHUB_REPOSITORY_URL,
  HRANESS_URL,
  absoluteSiteUrl,
  publicSitePath,
  site,
  socialMetadata,
} from "../site";
import {
  aboutDescription,
  aboutSocialTitle,
  aboutTitle,
  independenceSentence,
  maintainerSentence,
  otherReferencesHeading,
  otherReferencesParts,
  privacySummary,
} from "../site-copy";

export const dynamic = "force-static";

function TopicIcon({ slug }: Readonly<{ slug: string }>) {
  // Decorative local SVG; next/image cannot optimize vector sources.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="sh-topic-icon" src={publicSitePath(`/icons/${slug}.svg`)} alt="" aria-hidden="true" width="40" height="40" loading="lazy" decoding="async" />
  );
}

export const metadata: Metadata = {
  title: { absolute: aboutTitle },
  description: aboutDescription,
  alternates: { canonical: absoluteSiteUrl("/about") },
  ...socialMetadata(aboutSocialTitle, aboutDescription, "/about"),
};

export default async function AboutPage() {
  const [history, researchRuns] = await Promise.all([
    loadHistory(),
    loadResearchRuns(),
  ]);
  const evidence = summarizeHistoryEvidence(history, researchRuns);

  return (
    <main className="plain-page stripe-history-main" id="main-content">
      <JsonLdScript
        data={[
          aboutPageJsonLd(),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "About", path: "/about" },
          ]),
        ]}
        id="stripe-history-about-structured-data"
      />
      <SiteHeader aboutSelected />
      <nav aria-label="Breadcrumb" className="stripe-history-breadcrumbs">
        <Link href="/">stripe history</Link>
        <span aria-hidden="true"> / </span>
        <span>about</span>
      </nav>
      <section
        aria-labelledby="about-heading"
        className="stripe-history-about stripe-history-section"
      >
        <div className="stripe-history-section-heading">
          <h1 id="about-heading">About {site.name}</h1>
        </div>

        <div className="stripe-history-about-topic">
          <TopicIcon slug="company-history" />
          <h2>Stripe history</h2>
        </div>
        <p>Stripe History follows the company from the founders&apos; projects in 2005 through its products, acquisitions, funding, and expansion. It also covers the founders&apos; projects outside Stripe, annual financial disclosures, and leadership interviews. Each event links to its sources.</p>

        <div className="stripe-history-about-topic">
          <TopicIcon slug="evidence" />
          <h2 id="evidence-status">Evidence status</h2>
        </div>
        <EvidenceSnapshot summary={evidence} />

        <div className="stripe-history-about-topic">
          <TopicIcon slug="sources" />
          <h2 id="sources-and-review">Sources and review</h2>
        </div>
        <p>
          Stripe History is a dated record in which every entry links to its
          sources, and the whole record{" "}
          <Link href="/data">downloads as YAML</Link>.{" "}
          <a href="#other-stripe-references">Other Stripe references</a> lists
          where Wikipedia, Sacra and others serve a reader better.
        </p>
        <p>
          Every history entry resolves to at least one cataloged source. Review
          prefers primary material and filings, uses strong contemporaneous
          reporting where necessary, checks chronology, category placement,
          source support, and duplicate claims, and preserves uncertainty when
          a transaction or event was only proposed or reported.
        </p>
        <p>
          “Citations” counts each link between a timeline entry and a source in
          the catalog. It is not a count of independently corroborated claims:
          one source can support more than one entry, and one entry can cite
          more than one source. The{" "}
          <a href={publicSitePath("/research/sources.yml")}>source catalog</a>
          {" "}lists every source.
        </p>
        <p>
          “Last research run” is the date of the most recent completed research
          run. Each run covers one research collection, not the whole timeline.
          The{" "}
          <a href={publicSitePath("/research/collections.yml")}>collection definitions</a>
          {" "}and the{" "}
          <a href={publicSitePath("/research/runs.yml")}>research-run log</a>,
          both YAML, show what each run covered.
        </p>

        <div className="stripe-history-about-topic">
          <TopicIcon slug="publications" />
          <h2>Publications followed</h2>
        </div>
        <p>
          Weekly discovery reads first-party and Stripe-affiliated publication
          feeds. The timeline records those publications when they become part
          of Stripe&apos;s editorial history. It does not turn every newsletter
          essay into its own event.
        </p>
        <p>
          Followed publications include{" "}
          <a href="https://www.stripeeconomics.com/">Stripe Economics</a>,{" "}
          <a href="https://worksinprogress.co/">Works in Progress</a>, and{" "}
          <a href="https://press.stripe.com/">Stripe Press</a>. Discovery also
          reads first-party{" "}
          <a href="https://stripe.com/blog">Stripe Blog</a> and{" "}
          <a href="https://stripe.dev/blog">Stripe.dev Blog</a> RSS, and the{" "}
          <a href="https://podcasts.apple.com/us/podcast/cheeky-pint/id1821055332">
            Cheeky Pint
          </a>{" "}
          episode feed.
        </p>

        <div className="stripe-history-about-topic">
          <TopicIcon slug="independence" />
          <h2 id="independence-and-corrections">Independence and corrections</h2>
        </div>
        <p>{independenceSentence}</p>
        <p>
          Send the affected entry, proposed correction, and supporting source through the{" "}
          <a href={`${GITHUB_REPOSITORY_URL}/issues`}>public issue tracker</a>.
          See <Link href="/contact#security">contact</Link> for security reports.
        </p>

        <h2>Publisher and contributions</h2>
        <p>
          Published by <a href={HRANESS_URL}>Hraness</a>. {maintainerSentence}{" "}
          The <a href={GITHUB_REPOSITORY_URL}>source and data</a> are public.
        </p>

        <h2 id="other-stripe-references">{otherReferencesHeading}</h2>
        <p>
          {otherReferencesParts.map(({ href, text }) => (
            href === undefined ? text : <a href={href} key={href}>{text}</a>
          ))}
        </p>

        <div className="stripe-history-about-topic">
          <TopicIcon slug="privacy" />
          <h2>Privacy</h2>
        </div>
        <EditorialParagraph parts={privacySummary} />
      </section>
      <SiteFooter path="/about" />
    </main>
  );
}
