import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { breadcrumbJsonLd } from "../seo";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import {
  contactDescription,
  contactSocialTitle,
  contactTitle,
  independenceSentence,
} from "../site-copy";
import {
  GITHUB_REPOSITORY_URL,
  HRANESS_URL,
  absoluteSiteUrl,
  site,
  socialMetadata,
} from "../site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: contactTitle },
  description: contactDescription,
  alternates: { canonical: absoluteSiteUrl("/contact") },
  ...socialMetadata(contactSocialTitle, contactDescription, "/contact"),
};

export default function ContactPage() {
  return (
    <main className="plain-page stripe-history-main" id="main-content">
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "History", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
        id="stripe-history-contact-structured-data"
      />
      <SiteHeader />
      <nav aria-label="Breadcrumb" className="stripe-history-breadcrumbs">
        <Link href="/">stripe history</Link>
        <span aria-hidden="true"> / </span>
        <span>contact</span>
      </nav>
      <section
        aria-labelledby="contact-heading"
        className="stripe-history-about stripe-history-section"
      >
        <div className="stripe-history-section-heading">
          <h1 id="contact-heading">Contact {site.name}</h1>
        </div>
        <h2 id="corrections-and-sources">Corrections and sources</h2>
        <p>
          Send corrections, missing events, or better sources through the{" "}
          <a href={`${GITHUB_REPOSITORY_URL}/issues`}>Stripe History issue tracker</a>.
          Include the affected entry, the proposed correction, and a supporting source.
        </p>
        <h2 id="security">Security</h2>
        <p>
          Report suspected vulnerabilities through{" "}
          <a href={`${GITHUB_REPOSITORY_URL}/security/advisories/new`}>GitHub&apos;s private vulnerability reporting</a>.
          Keep sensitive details out of public issues.
        </p>
        <h2>Publisher</h2>
        <p>Published by <a href={HRANESS_URL}>Hraness</a>. {independenceSentence}</p>
        <p>
          Read <Link href="/about">about</Link> for the editorial method and{" "}
          <Link href="/privacy">privacy</Link> for analytics, newsletter signup,
          optional support, and historical mailing consent.
        </p>
      </section>
      <SiteFooter path="/contact" />
    </main>
  );
}
