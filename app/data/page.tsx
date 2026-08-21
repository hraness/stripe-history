import { loadHistory } from "@/lib/content";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { historyDatasetJsonLd, breadcrumbJsonLd } from "../seo";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import { GITHUB_REPOSITORY_URL, site, socialMetadata } from "../site";

const dataTitle = "Stripe Company History Dataset";
const dataDescription = site.datasetDescription;

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
    <main className="plain-page stripedex-main" id="main-content">
      <JsonLdScript
        data={[
          historyDatasetJsonLd(history),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "Data", path: "/data" },
          ]),
        ]}
        id="stripedex-dataset-structured-data"
      />
      <SiteHeader />
      <nav aria-label="Breadcrumb" className="stripedex-breadcrumbs">
        <Link href="/">history</Link>
        <span aria-hidden="true"> / </span>
        <span>data</span>
      </nav>
      <section aria-labelledby="data-heading" className="stripedex-section">
        <div className="stripedex-section-heading">
          <h1 id="data-heading">{dataTitle}</h1>
          <span>{history.events.length} sourced events</span>
        </div>
        <p className="stripedex-data-intro">
          These reviewable YAML files power the public timeline and valuation
          record. History entries preserve chronology, category, summary,
          confidence, and status when applicable; the research files preserve
          canonical source identities, valuation observations, leadership
          appearances, collection scope, and review runs. The dataset and
          website code are available under the MIT License in the{" "}
          <a href={GITHUB_REPOSITORY_URL}>Stripedex repository</a>.
        </p>
        <section
          aria-labelledby="dataset-questions-heading"
          className="stripedex-data-questions"
        >
          <h2 id="dataset-questions-heading">Questions this history answers</h2>
          <dl>
            <div>
              <dt>How did Stripe start, and who has led the company?</dt>
              <dd>
                Follow the sourced records for{" "}
                <Link href="/history/origins-and-early-company">
                  Stripe&apos;s origins and early company
                </Link>{" "}
                and{" "}
                <Link href="/history/executives-and-team">
                  executive and team changes
                </Link>.
              </dd>
            </div>
            <div>
              <dt>What companies has Stripe acquired?</dt>
              <dd>
                The{" "}
                <Link href="/history/acquisitions">
                  Stripe acquisitions history
                </Link>{" "}
                distinguishes completed acquisitions, talent acquisitions,
                announced agreements, and reported deal discussions.
              </dd>
            </div>
            <div>
              <dt>How have Stripe&apos;s funding and valuation changed?</dt>
              <dd>
                Compare{" "}
                <Link href="/history/fundraising">
                  fundraising and liquidity events
                </Link>{" "}
                with the sourced{" "}
                <Link href="/history/valuation">Stripe valuation history</Link>.
              </dd>
            </div>
            <div>
              <dt>How much payment volume has Stripe processed?</dt>
              <dd>
                The{" "}
                <Link href="/history/payment-volume">
                  annual payment and total volume record
                </Link>{" "}
                charts disclosed figures on a normal linear scale.
              </dd>
            </div>
            <div>
              <dt>When did Stripe launch products and expand globally?</dt>
              <dd>
                Browse{" "}
                <Link href="/history/product-launches">product launches</Link>,{" "}
                <Link href="/history/country-expansion">country expansion</Link>,
                and{" "}
                <Link href="/history/payment-and-payout-expansion">
                  payment and payout expansion
                </Link>{" "}
                as separate sourced chronologies.
              </dd>
            </div>
          </dl>
        </section>
        <ul className="stripedex-data-list">
          {history.categories.map((category) => (
            <li key={category.id}>
              <h2>
                <Link href={`/history/${category.id}`}>{category.label}</Link>
              </h2>
              <p>{category.description}</p>
              <p>
                {countByCategory.get(category.id) ?? 0} events ·{" "}
                <a href={category.id === "appearances"
                  ? "/research/appearances.yml"
                  : `/history/${category.id}.yml`}>download YAML</a>
              </p>
            </li>
          ))}
        </ul>
        <section
          aria-labelledby="research-data-heading"
          className="stripedex-data-research"
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
