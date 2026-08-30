import { HranessSiteFooter } from "@hraness/site-footer/react";
import { AskAiAboutThis } from "@hraness/ui";

import { stripeHistoryMailingListConfig } from "./mailing-config";
import {
  absoluteSiteUrl,
  GITHUB_REPOSITORY_URL,
  publicSitePath,
  type SitePath,
} from "./site";

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
      <aside aria-label="Stripe History resources" className="stripe-history-footer-resources">
        <p className="stripe-history-footer-resources__label">Stripe History</p>
        <nav aria-label="Stripe History links" className="stripe-history-footer-resources__links">
          <a href={publicSitePath("/data")}>data</a>
          <a href={publicSitePath("/about")}>about</a>
          <a href={publicSitePath("/contact")}>contact</a>
          <a href={publicSitePath("/privacy")}>privacy</a>
          <a href={GITHUB_REPOSITORY_URL}>github</a>
        </nav>
      </aside>
      <HranessSiteFooter mailingList={stripeHistoryMailingListConfig()} />
    </>
  );
}
