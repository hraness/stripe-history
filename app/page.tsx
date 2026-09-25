import {
  loadHistory,
  loadResearchRuns,
  summarizeHistoryEvidence,
} from "@/lib/content";
import { INDEXABLE_ROBOTS } from "@hraness/web-discovery";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";

import { HistoryView } from "./history/history-view";
import { historyCollectionJsonLd } from "./seo";
import { absoluteSiteUrl, site, socialMetadata } from "./site";
import { historyPageTitle } from "./site-copy";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: historyPageTitle },
    description: site.description,
    alternates: { canonical: absoluteSiteUrl("/") },
    robots: INDEXABLE_ROBOTS,
    ...socialMetadata(historyPageTitle, site.description, "/"),
  };
}

export default async function Home() {
  const [history, researchRuns] = await Promise.all([
    loadHistory(),
    loadResearchRuns(),
  ]);
  const evidence = summarizeHistoryEvidence(history, researchRuns);
  const title = historyPageTitle;

  return (
    <>
      <JsonLdScript
        data={historyCollectionJsonLd(history.events, {
          description: site.description,
          path: "/",
          title,
        })}
        id="stripe-history-history-structured-data"
      />
      <HistoryView evidence={evidence} history={history} />
    </>
  );
}
