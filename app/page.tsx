import { loadHistory } from "@/lib/content";
import { JsonLdScript } from "@/support/json-ld";
import type { Metadata } from "next";

import { HistoryView } from "./history/history-view";
import { historyCollectionJsonLd } from "./seo";
import { site, socialMetadata } from "./site";

export const dynamic = "force-static";

function historyTitle(eventCount: number): string {
  return `${site.historyTitle}: ${eventCount} Sourced Events`;
}

export async function generateMetadata(): Promise<Metadata> {
  const history = await loadHistory();
  const title = historyTitle(history.events.length);
  return {
    title,
    description: site.description,
    alternates: { canonical: "/" },
    ...socialMetadata(`${title} | ${site.domain}`, site.description, "/"),
  };
}

export default async function Home() {
  const history = await loadHistory();
  const title = historyTitle(history.events.length);

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
      <HistoryView history={history} />
    </>
  );
}
