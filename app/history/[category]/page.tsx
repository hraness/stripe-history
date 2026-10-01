import { historyCategoryPageCopy } from "@/lib/category-page-copy";
import {
  loadHistory,
  type CategorizedHistoryEvent,
} from "@/lib/content";
import {
  timelineCategoryIds,
  type TimelineCategoryId,
} from "@/lib/history-schema";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  appearanceCollectionJsonLd,
  breadcrumbJsonLd,
  historyCollectionJsonLd,
} from "../../seo";
import { absoluteSiteUrl, socialMetadata } from "../../site";
import { AcquisitionsAnswer, OriginsLead } from "../history-answers";
import { HistoryView } from "../history-view";

interface HistoryCategoryPageProps {
  readonly params: Promise<{ category: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return timelineCategoryIds.map((category) => ({ category }));
}

async function resolveCategory(categoryId: string) {
  const history = await loadHistory();
  const category = history.categories.find(({ id }) => id === categoryId);
  return category === undefined ? undefined : { category, history };
}

function categoryAnswer(
  categoryId: string,
  events: readonly CategorizedHistoryEvent[],
) {
  if (categoryId === "origins-and-early-company") return <OriginsLead events={events} />;
  if (categoryId === "acquisitions") return <AcquisitionsAnswer events={events} />;
  return undefined;
}

export async function generateMetadata({
  params,
}: HistoryCategoryPageProps): Promise<Metadata> {
  const { category: categoryId } = await params;
  const resolved = await resolveCategory(categoryId);
  if (resolved === undefined) return {};
  const path = `/history/${resolved.category.id}` as const;
  const { metaDescription, metaTitle } = historyCategoryPageCopy(resolved.category, resolved.history.events);
  const description = metaDescription ?? resolved.category.description;
  return {
    title: { absolute: metaTitle },
    description,
    alternates: { canonical: absoluteSiteUrl(path) },
    ...socialMetadata(metaTitle, description, path),
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
  const { heading, title } = historyCategoryPageCopy(
    resolved.category,
    resolved.history.events,
  );

  return (
    <>
      <JsonLdScript
        data={[
          resolved.category.id === "appearances"
            ? appearanceCollectionJsonLd(resolved.history)
            : historyCollectionJsonLd(visibleEvents, {
                description: resolved.category.description,
                path,
                title,
              }),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: resolved.category.label, path },
          ]),
        ]}
        id="stripe-history-history-category-structured-data"
      />
      <HistoryView
        answer={categoryAnswer(resolved.category.id, resolved.history.events)}
        heading={heading}
        history={resolved.history}
        selectedCategoryId={resolved.category.id as TimelineCategoryId}
      />
    </>
  );
}
