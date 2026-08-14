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
  "Download the open, source-linked YAML records behind the Stripe company history timeline, organized by canonical category.";

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
    <main className="plain-page stripe-guide-main" id="main-content">
      <JsonLdScript
        data={[
          historyDatasetJsonLd(history),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "Data", path: "/data" },
          ]),
        ]}
        id="stripe-guide-dataset-structured-data"
      />
      <SiteHeader />
      <nav aria-label="Breadcrumb" className="stripe-guide-breadcrumbs">
        <Link href="/">history</Link>
        <span aria-hidden="true"> / </span>
        <span>data</span>
      </nav>
      <section aria-labelledby="data-heading" className="stripe-guide-section">
        <div className="stripe-guide-section-heading">
          <h1 id="data-heading">{dataTitle}</h1>
          <span>{history.events.length} sourced events</span>
        </div>
        <p className="stripe-guide-data-intro">
          These reviewable YAML files power the public timeline. Each record
          includes its chronology, category, summary, confidence, status, and
          source provenance. The dataset and website code are available under
          the MIT License in the{" "}
          <a href={GITHUB_REPOSITORY_URL}>Stripe History repository</a>.
        </p>
        <ul className="stripe-guide-data-list">
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
      </section>
      <SiteFooter />
    </main>
  );
}
