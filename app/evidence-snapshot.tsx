import type { HistoryEvidenceSummary } from "@/lib/content";
import Link from "next/link";

import { evidenceLabels, researchRunNote } from "./site-copy";

export function formatReviewDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function EvidenceSnapshot({
  summary,
}: Readonly<{ summary: HistoryEvidenceSummary }>) {
  const reviewDate = summary.latestCompletedResearchRunOn;

  return (
    <div className="stripe-history-evidence">
      <dl aria-label="Current evidence snapshot">
        <div>
          <dt>{evidenceLabels.eventCount.toLocaleLowerCase("en-US")}</dt>
          <dd>{summary.eventCount}</dd>
        </div>
        <div>
          <dt>{evidenceLabels.sourceLinkCount.toLocaleLowerCase("en-US")}</dt>
          <dd>{summary.sourceLinkCount}</dd>
        </div>
        <div>
          <dt>{evidenceLabels.canonicalSourceCount.toLocaleLowerCase("en-US")}</dt>
          <dd>{summary.canonicalSourceCount}</dd>
        </div>
        <div>
          <dt>{evidenceLabels.latestCompletedResearchRunOn.toLocaleLowerCase("en-US")}</dt>
          <dd>
            {reviewDate === undefined
              ? "not recorded"
              : <time dateTime={reviewDate}>{formatReviewDate(reviewDate)}</time>}
          </dd>
        </div>
      </dl>
      <p className="stripe-history-evidence-note">
        {researchRunNote}
      </p>
      <nav aria-label="Evidence actions" className="stripe-history-evidence-actions">
        <ul role="list">
          <li><Link href="/about#sources-and-review">Method and limits</Link></li>
          <li><Link href="/data">Export YAML</Link></li>
          <li>
            <Link href="/contact#corrections-and-sources">
              Report a correction
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
