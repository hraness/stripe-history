import Link from "next/link";
import * as stylex from "@stylexjs/stylex";
import { closingStyles as styles } from "./history-closing.stylex";

import { GITHUB_REPOSITORY_URL, HRANESS_URL, publicSitePath } from "../site";

export function HistoryClosing() {
  return (
    <>
      <section
        aria-labelledby="history-questions-heading"
        className={`hraness-marketing-questions stripe-history-questions ${stylex.props(styles.section).className}`}
        data-hraness-marketing="questions"
        id="questions"
      >
        <header className={`hraness-marketing-questions__header ${stylex.props(styles.header).className}`}>
          <h2 className={`hraness-marketing-questions__heading ${stylex.props(styles.heading).className}`} id="history-questions-heading">
            About the record
          </h2>
        </header>
        <div className={`hraness-marketing-question-list ${stylex.props(styles.list).className}`}>
          <details className={`hraness-marketing-question ${stylex.props(styles.question).className}`}>
            <summary className={`hraness-marketing-question__summary ${stylex.props(styles.summary).className}`}>What counts as an event?</summary>
            <div className={`hraness-marketing-question__answer ${stylex.props(styles.answer).className}`}>
              <p {...stylex.props(styles.paragraph)}>
                The timeline follows Stripe’s products, acquisitions, people,
                funding, expansion, and scale. It also covers its publications,
                founder projects, and long-form leadership appearances. Events
                run from newest to oldest.
              </p>
              <p {...stylex.props(styles.paragraph)}>
                A publication’s launch or acquisition can be an event. Every
                essay it publishes does not become a separate timeline entry.
                The <Link href="/about">about page</Link> describes the full scope.
              </p>
            </div>
          </details>
          <details className={`hraness-marketing-question ${stylex.props(styles.question).className}`}>
            <summary className={`hraness-marketing-question__summary ${stylex.props(styles.summary).className}`}>How are sources checked?</summary>
            <div className={`hraness-marketing-question__answer ${stylex.props(styles.answer).className}`}>
              <p {...stylex.props(styles.paragraph)}>
                Every entry links to a source. Research favors primary material
                and filings, with contemporaneous reporting where needed.
                Proposed and reported events keep those labels; an announcement
                is not treated as a completed transaction.
              </p>
              <p {...stylex.props(styles.paragraph)}>
                Source-link counts are not independent confirmations. One source
                can support several entries. You can inspect the{" "}
                <a href={publicSitePath("/research/sources.yml")}>source catalog</a>
                {" "}and read the <Link href="/about#sources-and-review">review method and limits</Link>.
              </p>
            </div>
          </details>
          <details className={`hraness-marketing-question ${stylex.props(styles.question).className}`}>
            <summary className={`hraness-marketing-question__summary ${stylex.props(styles.summary).className}`}>How do I report a correction?</summary>
            <div className={`hraness-marketing-question__answer ${stylex.props(styles.answer).className}`}>
              <p {...stylex.props(styles.paragraph)}>
                Open an issue in the{" "}
                <a href={`${GITHUB_REPOSITORY_URL}/issues`}>Stripe History issue tracker</a>
                {" "}with the affected event, the proposed correction, and a
                supporting source. Keep uncertainty explicit if something was
                only proposed or reported.
              </p>
              <p {...stylex.props(styles.paragraph)}>
                The <Link href="/contact#corrections-and-sources">contact page</Link>
                {" "}lists the details to include and the private channel for
                security reports.
              </p>
            </div>
          </details>
        </div>
      </section>
      <section
        aria-labelledby="history-maker-heading"
        className={`hraness-marketing-maker stripe-history-maker ${stylex.props(styles.maker).className}`}
        data-hraness-marketing="maker"
        id="maker"
      >
        <header className={`hraness-marketing-maker__header ${stylex.props(styles.header).className}`}>
          <h2 className={`hraness-marketing-maker__heading ${stylex.props(styles.heading).className}`} id="history-maker-heading">Ben Guo</h2>
        </header>
        <div className={`hraness-marketing-maker__body ${stylex.props(styles.body).className}`}>
          <p {...stylex.props(styles.paragraph)}>
            Ben is a musician and builder, formerly a founder and engineering
            leader at companies including Venmo and Stripe, now based in Puerto
            Rico. He maintains Stripe History through Hraness as an independent
            project, not affiliated with or endorsed by Stripe, Inc.
          </p>
          <ul className={`hraness-marketing-maker__links ${stylex.props(styles.links).className}`}>
            <li><a href={HRANESS_URL}>hraness.com</a></li>
            <li><a href="https://x.com/hraness">@hraness</a></li>
            <li><a href={GITHUB_REPOSITORY_URL}>Source and data on GitHub</a></li>
          </ul>
        </div>
      </section>
    </>
  );
}
