import { loadHistory } from "@/lib/content";
import {
  historyCategoryIds,
  type HistoryCategoryId,
} from "@/lib/history-schema";
import { JsonLdScript } from "@/support/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { breadcrumbJsonLd, historyCollectionJsonLd } from "../../seo";
import { site, socialMetadata } from "../../site";
import { HistoryView } from "../history-view";

interface HistoryCategoryPageProps {
  readonly params: Promise<{ category: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return historyCategoryIds.map((category) => ({ category }));
}

async function resolveCategory(categoryId: string) {
  const history = await loadHistory();
  const category = history.categories.find(({ id }) => id === categoryId);
  return category === undefined ? undefined : { category, history };
}

function categoryTitle(label: string, eventCount: number): string {
  return `Stripe ${label} Timeline: ${eventCount} Sourced Events`;
}

export async function generateMetadata({
  params,
}: HistoryCategoryPageProps): Promise<Metadata> {
  const { category: categoryId } = await params;
  const resolved = await resolveCategory(categoryId);
  if (resolved === undefined) return {};
  const path = `/history/${resolved.category.id}` as const;
  const eventCount = resolved.history.events.filter(
    ({ categoryId: eventCategoryId }) => eventCategoryId === resolved.category.id,
  ).length;
  const title = categoryTitle(resolved.category.label, eventCount);
  const description = resolved.category.description;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...socialMetadata(`${title} | ${site.domain}`, description, path, {
      alt: `${resolved.category.label} timeline from ${site.domain}`,
    }),
  };
}

export default async function HistoryCategoryPage({
  params,
}: HistoryCategoryPageProps) {
  const { category: categoryId } = await params;
  const resolved = await resolveCategory(categoryId);
  if (resolved === undefined) notFound();
  const path = `/history/${resolved.category.id}` as const;
  const visibleEvents = resolved.history.events.filter(
    ({ categoryId: eventCategoryId }) => eventCategoryId === resolved.category.id,
  );
  const title = categoryTitle(resolved.category.label, visibleEvents.length);

  return (
    <>
      <JsonLdScript
        data={[
          historyCollectionJsonLd(visibleEvents, {
            description: resolved.category.description,
            path,
            title,
          }),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: resolved.category.label, path },
          ]),
        ]}
        id="stripe-guide-history-category-structured-data"
      />
      <HistoryView
        history={resolved.history}
        selectedCategoryId={resolved.category.id as HistoryCategoryId}
      />
    </>
  );
}
