import { HranessSiteFooter } from "@hraness/site-footer/react";
import { AskAiAboutThis } from "@hraness/ui";
import * as stylex from "@stylexjs/stylex";
import { footerResourcesStyles as styles } from "./site-footer.stylex";

import {
  absoluteSiteUrl,
  GITHUB_REPOSITORY_URL,
  publicSitePath,
  type SitePath,
} from "./site";
import { independenceSentence } from "./site-copy";

interface SiteFooterProps {
  readonly path?: SitePath;
}

export function SiteFooter({ path }: SiteFooterProps) {
  return (
    <>
      {path === undefined ? null : (
        <AskAiAboutThis
          className="stripe-history-ask-ai"
          url={absoluteSiteUrl(path)}
        />
      )}
      <aside aria-label="Stripe History resources" className={`stripe-history-footer-resources ${stylex.props(styles.root, path !== undefined && styles.afterAskAi).className}`}>
        <p className={`stripe-history-footer-resources__label ${stylex.props(styles.label).className}`}>Stripe History</p>
        <nav aria-label="Stripe History links" className={`stripe-history-footer-resources__links ${stylex.props(styles.links).className}`}>
          <a {...stylex.props(styles.link)} href={publicSitePath("/data")}>data</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/about")}>about</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/contact")}>contact</a>
          <a {...stylex.props(styles.link)} href={publicSitePath("/privacy")}>privacy</a>
          <a {...stylex.props(styles.link)} href={GITHUB_REPOSITORY_URL}>github</a>
        </nav>
        <p className={`stripe-history-footer-resources__note ${stylex.props(styles.label).className}`}>{independenceSentence}</p>
      </aside>
      <HranessSiteFooter
        mailingList={{ kind: "signup", audience: "hraness" }}
        support={{
          id: "hraness",
          name: "Hraness",
          updates: true,
          valueProposition: "Support Hraness and the free, open records it publishes, including Stripe History.",
        }}
      />
    </>
  );
}
