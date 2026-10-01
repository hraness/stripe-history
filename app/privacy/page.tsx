import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { breadcrumbJsonLd } from "../seo";
import { EditorialParagraph } from "../editorial-paragraph";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import {
  privacyContent,
  privacyDescription,
  privacySocialTitle,
  privacyTitle,
} from "../site-copy";
import {
  absoluteSiteUrl,
  socialMetadata,
} from "../site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: privacyTitle,
  description: privacyDescription,
  alternates: { canonical: absoluteSiteUrl("/privacy") },
  ...socialMetadata(privacySocialTitle, privacyDescription, "/privacy"),
};

export default function PrivacyPage() {
  return (
    <main className="plain-page stripe-history-main" id="main-content">
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "History", path: "/" },
          { name: "Privacy", path: "/privacy" },
        ])}
        id="stripe-history-privacy-structured-data"
      />
      <SiteHeader />
      <nav aria-label="Breadcrumb" className="stripe-history-breadcrumbs">
        <Link href="/">stripe history</Link>
        <span aria-hidden="true"> / </span>
        <span>privacy</span>
      </nav>
      <section
        aria-labelledby="privacy-heading"
        className="stripe-history-about stripe-history-section"
      >
        <div className="stripe-history-section-heading">
          <h1 id="privacy-heading">{privacyTitle}</h1>
        </div>
        {privacyContent.map((parts, index) => <EditorialParagraph parts={parts} key={index} />)}
      </section>
      <SiteFooter path="/privacy" />
    </main>
  );
}
