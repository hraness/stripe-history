import {
  ACQUISITIONS_TABLE_CAPTION,
  deriveAcquisitionsSummary,
} from "@/lib/acquisitions-table";
import { AT_A_GLANCE_CAPTION, deriveAtAGlance } from "@/lib/at-a-glance";
import type { CategorizedHistoryEvent, HistoryCollection } from "@/lib/content";
import type { LinkedTextPart } from "@/lib/linked-text";
import { deriveOriginsLead } from "@/lib/origins-lead";
import { Fragment } from "react";

import { publicSitePath } from "../site";

function LinkedText({ parts }: Readonly<{ parts: readonly LinkedTextPart[] }>) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.target === undefined) return <Fragment key={index}>{part.text}</Fragment>;
        const href = part.target.kind === "event"
          ? `#${part.target.eventId}`
          : publicSitePath(part.target.path);
        return <a href={href} key={index}>{part.text}</a>;
      })}
    </>
  );
}

/** The founding answer shown above the origins timeline. */
export function OriginsLead({
  events,
}: Readonly<{ events: readonly CategorizedHistoryEvent[] }>) {
  return (
    <p className="history-answer-lead" data-answer="origins">
      <LinkedText parts={deriveOriginsLead(events)} />
    </p>
  );
}

/** The acquisitions lead and one status-labeled row per acquisition event. */
export function AcquisitionsAnswer({
  events,
}: Readonly<{ events: readonly CategorizedHistoryEvent[] }>) {
  const summary = deriveAcquisitionsSummary(events);
  return (
    <div className="history-answer" data-answer="acquisitions">
      <p className="history-answer-lead">{summary.lead}</p>
      <div className="history-answer-table-wrap">
        <table className="history-answer-table">
          <caption>{ACQUISITIONS_TABLE_CAPTION}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Deal</th>
              <th scope="col">Status</th>
              <th scope="col">Price</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.eventId}>
                <td className="history-answer-nowrap">
                  <time dateTime={row.date}>{row.dateLabel}</time>
                </td>
                <th scope="row"><a href={`#${row.eventId}`}>{row.deal}</a></th>
                <td>{row.status}</td>
                <td>{row.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The home page fact table, generated from records. */
export function AtAGlance({
  history,
}: Readonly<{
  history: Pick<HistoryCollection, "annualRevenues" | "annualVolumes" | "events" | "valuationHeadlines" | "valuations">;
}>) {
  return (
    <div className="history-answer history-at-a-glance" data-answer="at-a-glance">
      <table className="history-answer-table">
        <caption>{AT_A_GLANCE_CAPTION}</caption>
        <tbody>
          {deriveAtAGlance(history).map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td><LinkedText parts={row.value} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
