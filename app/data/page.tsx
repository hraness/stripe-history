import { loadHistory } from "@/lib/content";
import { JsonLdScript } from "@/support/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { historyDatasetJsonLd, breadcrumbJsonLd } from "../seo";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import { GITHUB_REPOSITORY_URL, site, socialMetadata } from "../site";

const dataTitle = "Stripe Company History Dataset";
const dataDescription =
  "Download the open, source-linked history and research YAML behind the Stripe timeline, valuation record, source catalog, appearances, collections, and research runs.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: dataTitle,
  description: dataDescription,
  alternates: { canonical: "/data" },
  ...socialMetadata(`${dataTitle} | ${site.domain}`, dataDescription, "/data", {
    alt: `Open Stripe company history data from ${site.domain}`,
  }),
};

export default async function DataPage() {
  const history = await loadHistory();
  const countByCategory = new Map(
    history.categories.map(({ id }) => [
      id,
      history.events.filter(({ categoryId }) => categoryId === id).length,
    ]),
  );

  return (
    <main className="plain-page stripe-history-main" id="main-content">
      <JsonLdScript
        data={[
          historyDatasetJsonLd(history),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "Data", path: "/data" },
          ]),
        ]}
        id="stripe-history-dataset-structured-data"
      />
      <SiteHeader />
      <nav aria-label="Breadcrumb" className="stripe-history-breadcrumbs">
        <Link href="/">history</Link>
        <span aria-hidden="true"> / </span>
        <span>data</span>
      </nav>
      <section aria-labelledby="data-heading" className="stripe-history-section">
        <div className="stripe-history-section-heading">
          <h1 id="data-heading">{dataTitle}</h1>
          <span>{history.events.length} sourced events</span>
        </div>
        <p className="stripe-history-data-intro">
          These reviewable YAML files power the public timeline and valuation
          record. History entries preserve chronology, category, summary,
          confidence, and status when applicable; the research files preserve
          canonical source identities, valuation observations, founder
          appearances, collection scope, and review runs. The dataset and
          website code are available under the MIT License in the{" "}
          <a href={GITHUB_REPOSITORY_URL}>Stripe History repository</a>.
        </p>
        <ul className="stripe-history-data-list">
          {history.categories.map((category) => (
            <li key={category.id}>
              <h2>
                <Link href={`/history/${category.id}`}>{category.label}</Link>
              </h2>
              <p>{category.description}</p>
              <p>
                {countByCategory.get(category.id) ?? 0} events ·{" "}
                <a href={`/history/${category.id}.yml`}>download YAML</a>
              </p>
            </li>
          ))}
        </ul>
        <section
          aria-labelledby="research-data-heading"
          className="stripe-history-data-research"
        >
          <h2 id="research-data-heading">Research and provenance</h2>
          <p>
            Browse the <Link href="/history/valuation">valuation history</Link> or
            inspect the machine-readable research records directly.
          </p>
          <ul>
            <li>
              <a href="/research/sources.yml">source catalog YAML</a> ·{" "}
              {history.sources.length} canonical sources
            </li>
            <li>
              <a href="/research/valuations.yml">valuation observations YAML</a> ·{" "}
              {history.valuations.length} observations
            </li>
            <li>
              <a href="/research/appearances.yml">founder appearances YAML</a> ·{" "}
              {history.appearances.length} appearances
            </li>
            <li>
              <a href="/research/collections.yml">research collections YAML</a>
            </li>
            <li><a href="/research/runs.yml">research run ledger YAML</a></li>
          </ul>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
