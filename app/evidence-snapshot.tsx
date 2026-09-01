import type { HistoryEvidenceSummary } from "@/lib/content";
import Link from "next/link";

function formatReviewDate(value: string): string {
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
          <dt>timeline entries</dt>
          <dd>{summary.eventCount}</dd>
        </div>
        <div>
          <dt>entry source links</dt>
          <dd>{summary.sourceLinkCount}</dd>
        </div>
        <div>
          <dt>canonical sources</dt>
          <dd>{summary.canonicalSourceCount}</dd>
        </div>
        <div>
          <dt>review state</dt>
          <dd>
            {reviewDate === undefined
              ? "not recorded"
              : <time dateTime={reviewDate}>{formatReviewDate(reviewDate)}</time>}
          </dd>
        </div>
      </dl>
      <p className="stripe-history-evidence-note">
        Review state is the latest completed structured research-ledger run. It
        does not claim that every timeline category was re-reviewed on that date.
      </p>
      <nav aria-label="Evidence actions" className="stripe-history-evidence-actions">
        <ul role="list">
          <li><Link href="/about#sources-and-review">Method &amp; limits</Link></li>
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
