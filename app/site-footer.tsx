import { HranessCookieConsent } from "@hraness/site-footer/react";
import * as stylex from "@stylexjs/stylex";
import { footerStyles as styles } from "./site-footer.stylex";
import { PrivacyChoicesLink } from "./analytics-client";

import { GITHUB_REPOSITORY_URL, HRANESS_URL, publicSitePath, site } from "./site";
import { independenceSentence } from "./site-copy";

/**
 * One quiet footer row, the shared Hraness product footer: the record's own
 * links on the left, then Your Privacy Choices and the HRANESS wordmark (set
 * like the hraness.com wordmark) on the right, with the independence note as
 * one small muted line under the row. The shared consent note is the
 * package's own component, kept for parity; analytics.css hides it because
 * the @hraness/analytics banner and Your Privacy Choices are the consent UI.
 */
export function SiteFooter() {
  return (
    <footer aria-label="Site" className={`stripe-history-footer ${stylex.props(styles.root).className}`} id="stripe-history-footer">
      <div className={`stripe-history-footer__inner ${stylex.props(styles.inner).className}`}>
        <nav aria-label={site.name} className={`stripe-history-footer__links ${stylex.props(styles.group).className}`}>
          <a {...stylex.props(styles.link)} href={publicSitePath("/data")}>Data</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/about")}>About</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/contact")}>Contact</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/privacy")}>Privacy</a>
          <a {...stylex.props(styles.link)} href={GITHUB_REPOSITORY_URL}>GitHub</a>
        </nav>
        <div className={`stripe-history-footer__end ${stylex.props(styles.group, styles.end).className}`}>
          <PrivacyChoicesLink className={stylex.props(styles.link).className ?? ""}>Your Privacy Choices</PrivacyChoicesLink>
          <a
            className={`stripe-history-footer__wordmark ${stylex.props(styles.link, styles.wordmark).className}`}
            data-analytics-cta="footer-hraness"
            href={HRANESS_URL}
          >
            Hraness
          </a>
        </div>
      </div>
      <p className={`stripe-history-footer__note ${stylex.props(styles.note).className}`}>{independenceSentence}</p>
      <HranessCookieConsent placement="flow" />
    </footer>
  );
}
