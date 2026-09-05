import {
  MarketingMaker,
  MarketingQuestionList,
} from "@hraness/design-kit/react/server";
import Link from "next/link";

import {
  GITHUB_REPOSITORY_URL,
  HRANESS_URL,
  publicSitePath,
  site,
} from "../site";
import { independenceSentence } from "../site-copy";

/**
 * The questions and maker sections that close the root timeline. Every
 * answer repeats text the about and contact pages already publish.
 */
export function HistoryClosing() {
  return (
    <>
      <MarketingQuestionList
        className="stripe-history-questions"
        heading="What the timeline includes and how it is checked."
        headingId="history-questions-heading"
        id="questions"
        label="Questions"
        questions={[
          {
            answer: (
              <>
                <p>
                  {site.domain} publishes a reverse-chronological company
                  timeline covering acquisitions, products, leadership, funding,
                  valuation, expansion, offices, publishing projects, founder
                  side projects and aesthetics programs, early history, annual
                  volume, sourced annual net-revenue disclosures, and reviewed
                  long-form appearances by Stripe founders and senior leaders.
                </p>
                <p>
                  Weekly discovery reads first-party and Stripe-affiliated
                  publication feeds. The timeline records those publications
                  when they become part of Stripe&apos;s editorial history. It
                  does not turn every newsletter essay into its own event.
                </p>
              </>
            ),
            question: "What counts as an event?",
          },
          {
            answer: (
              <>
                <p>
                  Every history entry resolves to at least one cataloged source.
                  Review prefers primary material and filings, uses strong
                  contemporaneous reporting where necessary, checks chronology,
                  category placement, source support, and duplicate claims, and
                  preserves uncertainty when a transaction or event was only
                  proposed or reported.
                </p>
                <p>
                  “Entry source links” counts the relationships between timeline
                  entries and catalog records; it is not a count of
                  independently corroborated claims. One source can support
                  more than one entry, and one entry can cite more than one
                  source. The{" "}
                  <a href={publicSitePath("/research/sources.yml")}>source catalog</a>
                  {" "}keeps canonical identities reviewable, and the{" "}
                  <Link href="/about#sources-and-review">about page</Link>
                  {" "}explains the review limits.
                </p>
              </>
            ),
            question: "How are sources checked?",
          },
          {
            answer: (
              <>
                <p>
                  Use public GitHub issues for ordinary historical corrections,
                  missing events, stronger sources, and focused software
                  improvements. Include the event date, a concise factual
                  claim, its category, the proposed confidence and status, and
                  at least one source URL. Prefer primary sources. If a claim
                  was only proposed or reported, keep that uncertainty in the
                  record.
                </p>
                <p>
                  Open those reports in the{" "}
                  <a href={`${GITHUB_REPOSITORY_URL}/issues`}>
                    Stripe History issue tracker
                  </a>. The{" "}
                  <Link href="/contact#corrections-and-sources">contact page</Link>
                  {" "}keeps those requirements easy to find.
                </p>
              </>
            ),
            question: "How do I report a correction?",
          },
          {
            answer: (
              <>
                <p>
                  Published and maintained by <a href={HRANESS_URL}>Hraness</a>.
                  {" "}{independenceSentence}
                </p>
                <p>
                  The complete sourced records and website code are in the{" "}
                  <a href={GITHUB_REPOSITORY_URL}>Stripe History repository</a>.
                  To inspect or reuse the current record,{" "}
                  <Link href="/data">export the public YAML</Link>.
                </p>
              </>
            ),
            question: "Who made it?",
          },
        ]}
      />
      <MarketingMaker
        className="stripe-history-maker"
        heading="Ben Guo"
        headingId="history-maker-heading"
        id="maker"
        label="Built by"
        links={[
          { href: HRANESS_URL, label: "hraness.com" },
          { href: "https://x.com/hraness", label: "@hraness" },
          { href: GITHUB_REPOSITORY_URL, label: "GitHub" },
        ]}
      >
        <p>
          Stripe History is built and maintained by Ben Guo, a musician and
          builder, formerly a founder and engineering leader at companies
          including Venmo and Stripe, now building from Puerto Rico. He
          publishes it through Hraness as an independent project: it is not
          affiliated with, endorsed by, or operated by Stripe, Inc.
        </p>
      </MarketingMaker>
    </>
  );
}
