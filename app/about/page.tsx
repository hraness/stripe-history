import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { aboutPageJsonLd, breadcrumbJsonLd } from "../seo";
import { SiteHeader } from "../site-header";
import { SiteFooter } from "../site-footer";
import {
  GITHUB_REPOSITORY_URL,
  HRANESS_URL,
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
  alternates: { canonical: "/about" },
  ...socialMetadata(aboutSocialTitle, aboutDescription, "/about", {
    alt: `About the independent Stripe company history at ${site.domain}`,
  }),
};

export default function AboutPage() {
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
          early history, annual volume, and reviewed long-form appearances by
          Stripe founders and senior leaders.
        </p>

        <h2>Sources and review</h2>
        <p>
          History entries link to primary sources or strong contemporaneous
          reporting. Editorial review checks chronology, source support,
          category placement, and duplicate claims, and preserves uncertainty
          when a transaction or event was only proposed or reported.
        </p>

        <h2>Independence and corrections</h2>
        <p>
          {site.domain} is not affiliated with, endorsed by, or operated by
          Stripe, Inc. Stripe names and trademarks belong to their respective
          owners. Corrections are made in the underlying sourced records so the
          timeline and its focused category views stay aligned.
        </p>

        <h2>Publisher and contributions</h2>
        <p>
          Published and maintained by <a href={HRANESS_URL}>Hraness</a>. To
          suggest a correction, add a source, or improve the project, open an
          issue or contribution in the{" "}
          <a href={GITHUB_REPOSITORY_URL}>Stripe History repository</a>.
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
          no user accounts or authentication. Requests are still subject to the
          ordinary logs and security controls of the hosting provider.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
