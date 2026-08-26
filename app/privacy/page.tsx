import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { breadcrumbJsonLd } from "../seo";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import {
  privacyDescription,
  privacySocialTitle,
  privacyTitle,
} from "../site-copy";
import {
  absoluteSiteUrl,
  GITHUB_REPOSITORY_URL,
  site,
  socialMetadata,
} from "../site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: privacyTitle,
  description: privacyDescription,
  alternates: { canonical: absoluteSiteUrl("/privacy") },
  ...socialMetadata(privacySocialTitle, privacyDescription, "/privacy", {
    alt: `Privacy practices for the independent Stripe company history at ${site.domain}`,
  }),
};

export default function PrivacyPage() {
  return (
    <main className="plain-page stripedex-main" id="main-content">
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "History", path: "/" },
          { name: "Privacy", path: "/privacy" },
        ])}
        id="stripedex-privacy-structured-data"
      />
      <SiteHeader />
      <nav aria-label="Breadcrumb" className="stripedex-breadcrumbs">
        <Link href="/">history</Link>
        <span aria-hidden="true"> / </span>
        <span>privacy</span>
      </nav>
      <section
        aria-labelledby="privacy-heading"
        className="stripedex-about stripedex-section"
      >
        <div className="stripedex-section-heading">
          <h1 id="privacy-heading">{privacyTitle}</h1>
          <span>public pages</span>
        </div>
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
        <p>
          {site.domain} does not sell personal data, does not run advertising
          pixels, and does not keep a reader profile. Appearance preferences
          stay in the browser. Machine-readable copies of the public pages are
          available as Markdown when a client sends{" "}
          <code>Accept: text/markdown</code>, and the authored YAML records
          remain downloadable from the{" "}
          <Link href="/data">dataset index</Link>.
        </p>
        <p>
          Questions about this policy belong on the{" "}
          <Link href="/contact">contact page</Link> or in the{" "}
          <a href={GITHUB_REPOSITORY_URL}>Stripedex repository</a>. The broader
          sourcing and independence statement lives on the{" "}
          <Link href="/about">about page</Link>.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
