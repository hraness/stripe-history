import Link from "next/link";
import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { orientationStyles as styles } from "./history-orientation.stylex";

import { site } from "../site";
import { bylineText } from "../site-copy";

/**
 * The root introduction, set like a reference work: the record's name, one
 * line on what it is, and the quiet disclosure lines, followed directly by the
 * facts at a glance and the timeline.
 */
export function HistoryOrientation({ afterHero }: Readonly<{ afterHero?: ReactNode }>) {
  return (
    <>
      <header
        aria-labelledby="history-heading"
        className={`hraness-marketing-hero history-orientation ${stylex.props(styles.hero).className}`}
        data-hraness-marketing="hero"
        data-tone="paper"
      >
        <h1 className={`hraness-marketing-hero__heading ${stylex.props(styles.hero__heading).className}`} id="history-heading">
          {site.name}
        </h1>
        <p className={`hraness-marketing-hero__summary ${stylex.props(styles.hero__summary).className}`}>
          {site.heroHeading}
        </p>
        <p className={`hraness-marketing-hero__boundary ${stylex.props(styles.hero__boundary).className}`}>
          {bylineText} Not affiliated with, endorsed by, or operated by Stripe, Inc.{" "}
          <Link href="/contact#corrections-and-sources">Report a correction</Link>.
        </p>
      </header>
      {afterHero}
    </>
  );
}
