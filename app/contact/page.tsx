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
  site,
  socialMetadata,
} from "../site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: contactTitle,
  description: contactDescription,
  alternates: { canonical: "/contact" },
  ...socialMetadata(contactSocialTitle, contactDescription, "/contact", {
    alt: `Contact channels for the independent Stripe company history at ${site.domain}`,
  }),
};

export default function ContactPage() {
  return (
    <main className="plain-page stripedex-main" id="main-content">
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "History", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
        id="stripedex-contact-structured-data"
      />
      <SiteHeader />
      <nav aria-label="Breadcrumb" className="stripedex-breadcrumbs">
        <Link href="/">history</Link>
        <span aria-hidden="true"> / </span>
        <span>contact</span>
      </nav>
      <section
        aria-labelledby="contact-heading"
        className="stripedex-about stripedex-section"
      >
        <div className="stripedex-section-heading">
          <h1 id="contact-heading">Contact {site.domain}</h1>
          <span>public channels</span>
        </div>
        <h2>Corrections and sources</h2>
        <p>
          Use public GitHub issues for ordinary historical corrections, missing
          events, stronger sources, and focused software improvements. Include
          the event date, a concise factual claim, its category, the proposed
          confidence and status, and at least one source URL. Prefer primary
          sources. If a claim was only proposed or reported, keep that
          uncertainty in the record.
        </p>
        <p>
          Open those reports in the{" "}
          <a href={`${GITHUB_REPOSITORY_URL}/issues`}>
            Stripedex issue tracker
          </a>.
        </p>
        <h2>Security</h2>
        <p>
          Report suspected vulnerabilities through GitHub&apos;s private
          vulnerability reporting for this repository. Do not include sensitive
          details in a public issue.
        </p>
        <h2>Publisher</h2>
        <p>
          There is no reader account, contact form, or product inbox on{" "}
          {site.domain}. The project does not process payments, issue API keys,
          or operate a Stripe integration. {independenceSentence}
        </p>
        <p>
          Published and maintained by <a href={HRANESS_URL}>Hraness</a>. The
          complete sourced records and website code are in the{" "}
          <a href={GITHUB_REPOSITORY_URL}>Stripedex repository</a>. Read{" "}
          <Link href="/about">about</Link> for editorial method and{" "}
          <Link href="/privacy">privacy</Link> for analytics limits.
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
