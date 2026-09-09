import type { HistoryEvidenceSummary } from "@/lib/content";
import Link from "next/link";

import { EvidenceSnapshot } from "../evidence-snapshot";

export const historyHeadline = "Stripe’s history, dated and sourced";

export function historyLead(eventCount: number): string {
  return `${eventCount} dated events across products, funding, leadership, expansion, and scale, each linked to the source that reported it. Filter the timeline by category or compare the annual charts.`;
}

/** Keep the timeline first; source bookkeeping stays available on request. */
export function HistoryOrientation({
  evidence,
}: Readonly<{ evidence: HistoryEvidenceSummary }>) {
  return (
    <>
      <header
        aria-labelledby="history-heading"
        className="hraness-marketing-hero history-orientation"
        data-align="start"
        data-hraness-marketing="hero"
        data-tone="paper"
      >
        <div className="hraness-marketing-hero__copy">
          <h1 className="hraness-marketing-hero__heading" id="history-heading">
            {historyHeadline}
          </h1>
          <p className="hraness-marketing-hero__summary">
            {historyLead(evidence.eventCount)}
          </p>
          <div className="hraness-marketing-hero__actions">
            <a
              className="hraness-marketing-action"
              data-emphasis="primary"
              href="#timeline"
            >
              Browse the timeline
            </a>
            <Link
              className="hraness-marketing-action"
              data-emphasis="secondary"
              href="/data"
            >
              Download the data
            </Link>
          </div>
          <p className="hraness-marketing-hero__boundary">
            Not affiliated with, endorsed by, or operated by Stripe, Inc.{" "}
            <Link href="/contact#corrections-and-sources">Report a correction</Link>.
          </p>
        </div>
      </header>
      <details className="history-source-details">
        <summary>Sources and review</summary>
        <EvidenceSnapshot summary={evidence} />
      </details>
    </>
  );
}
