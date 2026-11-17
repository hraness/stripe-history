import { HranessCookieConsent } from "@hraness/site-footer/react";
import * as stylex from "@stylexjs/stylex";
import { footerStyles as styles } from "./site-footer.stylex";
import { PrivacyChoicesLink } from "./analytics-client";

import { GITHUB_REPOSITORY_URL, HRANESS_URL, publicSitePath, site } from "./site";
import { independenceSentence } from "./site-copy";

/**
 * One quiet footer: the record's own links, the HRANESS wordmark (set like
 * the hraness.com wordmark), the independence note, and the shared consent
 * consent note. The note is the shared package's own component, kept for
 * parity with the former footer; analytics.css hides it because the
 * @hraness/analytics banner and Your Privacy Choices are the consent UI.
 */
export function SiteFooter() {
  return (
    <footer className={`stripe-history-footer ${stylex.props(styles.root).className}`} id="stripe-history-footer">
      <div className={`stripe-history-footer__row ${stylex.props(styles.row).className}`}>
        <nav aria-label={`${site.name} links`} className={`stripe-history-footer__links ${stylex.props(styles.links).className}`}>
          <a {...stylex.props(styles.link)} href={publicSitePath("/data")}>Data</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/about")}>About</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/contact")}>Contact</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/privacy")}>Privacy</a>
          <PrivacyChoicesLink className={stylex.props(styles.link).className ?? ""}>Your Privacy Choices</PrivacyChoicesLink>
          <a {...stylex.props(styles.link)} href={GITHUB_REPOSITORY_URL}>GitHub</a>
        </nav>
        <a
          className={`stripe-history-footer__wordmark ${stylex.props(styles.wordmark).className}`}
          data-analytics-cta="footer-hraness"
          href={HRANESS_URL}
        >
          Hraness
        </a>
      </div>
      <p className={`stripe-history-footer__note ${stylex.props(styles.note).className}`}>{independenceSentence}</p>
      <HranessCookieConsent placement="flow" />
    </footer>
  );
}
