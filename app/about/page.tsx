import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import {
  loadHistory,
  loadResearchRuns,
  summarizeHistoryEvidence,
} from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";

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

const aboutTitle = "About";
const aboutSocialTitle = `About ${site.domain}`;
const aboutDescription =
  `How ${site.domain} selects, summarizes, sources, reviews, corrects, and measures its independent Stripe company history.`;

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: aboutTitle,
  description: aboutDescription,
  alternates: { canonical: absoluteSiteUrl("/about") },
  ...socialMetadata(aboutSocialTitle, aboutDescription, "/about", {
    alt: `About the independent Stripe company history at ${site.domain}`,
  }),
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
        <Link href="/">history</Link>
        <span aria-hidden="true"> / </span>
        <span>about</span>
      </nav>
      <section
        aria-labelledby="about-heading"
        className="stripe-history-about stripe-history-section"
      >
        <div className="stripe-history-section-heading">
          <h1 id="about-heading">About {site.domain}</h1>
          <span>independent</span>
        </div>

        <h2>Stripe company history</h2>
        <p>
          {site.domain} is an independent, sourced guide to Stripe. It publishes
          a reverse-chronological company timeline covering acquisitions,
          products, leadership, funding, valuation, expansion, offices,
          publishing projects, founder side projects and aesthetics programs,
          early history, annual volume, sourced annual net-revenue disclosures, and
          reviewed long-form appearances by Stripe founders and senior leaders.
        </p>

        <h2 id="evidence-status">Evidence status</h2>
        <EvidenceSnapshot summary={evidence} />

        <h2 id="sources-and-review">Sources and review</h2>
        <p>
          Every history entry resolves to at least one cataloged source. Review
          prefers primary material and filings, uses strong contemporaneous
          reporting where necessary, checks chronology, category placement,
          source support, and duplicate claims, and preserves uncertainty when
          a transaction or event was only proposed or reported.
        </p>
        <p>
          “Entry source links” counts the relationships between timeline entries
          and catalog records; it is not a count of independently corroborated
          claims. One source can support more than one entry, and one entry can
          cite more than one source. The{" "}
          <a href={publicSitePath("/research/sources.yml")}>source catalog</a>
          {" "}keeps canonical identities reviewable.
        </p>
        <p>
          The visible review state is the most recent completed structured run,
          not a claim that the whole corpus was re-reviewed that day. Collection
          coverage varies by research track. Inspect the{" "}
          <a href={publicSitePath("/research/collections.yml")}>collection scope</a>
          {" "}and{" "}
          <a href={publicSitePath("/research/runs.yml")}>research-run ledger</a>
          {" "}for the machine-readable boundaries.
        </p>

        <h2>Publications followed</h2>
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

        <h2 id="independence-and-corrections">Independence and corrections</h2>
        <p>
          {site.domain} is not affiliated with, endorsed by, or operated by
          Stripe, Inc. Stripe names and trademarks belong to their respective
          owners. Corrections are made in the underlying sourced records so the
          timeline and its focused category views stay aligned.
        </p>
        <p>
          To inspect or reuse the current record,{" "}
          <Link href="/data">export the public YAML</Link>. To challenge a date,
          claim, status, or source, use the{" "}
          <a href={GITHUB_REPOSITORY_URL + "/issues"}>public issue tracker</a>
          {" "}and include the affected entry, proposed correction, and supporting
          source. The <Link href="/contact#corrections-and-sources">contact page</Link>
          {" "}keeps those requirements easy to find.
        </p>

        <h2>Publisher and contributions</h2>
        <p>
          Published and maintained by <a href={HRANESS_URL}>Hraness</a>. To
          suggest a correction, add a source, or improve the project, open an
          issue or contribution in the{" "}
          <a href={GITHUB_REPOSITORY_URL}>Stripe History repository</a>. The same
          public channels are listed on the{" "}
          <Link href="/contact">contact page</Link>.
        </p>

        <h2>Privacy</h2>
        <p>
          The site sends anonymous, cookieless pageview events for public pages
          to PostHog. Each event contains the normalized public page path, its
          page category, a site identifier, an analytics schema version, and
          PostHog&apos;s cookieless marker. It excludes query strings, URL
          fragments, referrer properties, account data, and user content. The
          browser does not save an analytics cookie or identifier.
        </p>
        <p>
          The site does not use autocapture, session replay, heatmaps, surveys,
          feature flags, performance monitoring, or user profiles, and it has
          no local reader accounts or authentication. Requests are still
          subject to the ordinary logs and security controls of the hosting
          provider. Optional mailing signup is handled by Hraness Accounts.
        </p>
        <p>
          The dedicated <Link href="/privacy">privacy page</Link> repeats this
          policy for agents and other readers who look for <code>/privacy</code>.
        </p>
      </section>
      <SiteFooter path="/about" />
    </main>
  );
}
