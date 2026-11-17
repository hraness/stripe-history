import { ThemeMenuButton } from "@/support/theme";
import { MarketingSiteHeader } from "@hraness/design-kit/react/server";
import { AskAi } from "./ask-ai";
import { absoluteSiteUrl, HRANESS_URL, publicSitePath, site, type SitePath } from "./site";

export const HEADER_CTA_LABEL = "More from Hraness" as const;

/**
 * The product-family glass bar: the Stripe History wordmark links home, three
 * quiet section links stay on the site, and one muted link points to the rest
 * of Hraness before the single appearance control. The HRANESS wordmark lives
 * in the footer. Native anchors use explicit canonical /stripe paths.
 */
export function SiteHeader({
  aboutSelected = false,
  askAiPath,
  dataSelected = false,
  valuationSelected = false,
}: Readonly<{ aboutSelected?: boolean; askAiPath?: SitePath; dataSelected?: boolean; valuationSelected?: boolean }>) {
  return (
    <>
      <MarketingSiteHeader
        ariaLabel="primary navigation"
        brand={<span>{site.name}</span>}
        brandHref={publicSitePath("/")}
        brandLabel={`${site.name} home`}
        className="stripe-history-header hraness-material-chrome"
        links={[
          { href: publicSitePath("/history/valuation"), label: "Valuation", current: valuationSelected },
          { href: publicSitePath("/data"), label: "Data", current: dataSelected },
          { href: publicSitePath("/about"), label: "About", current: aboutSelected },
        ]}
        trailing={(
          <>
            <a
              aria-label={HEADER_CTA_LABEL}
              className="stripe-history-header-cta"
              data-analytics-cta="header-more-from-hraness"
              href={HRANESS_URL}
            >
              <span className="stripe-history-header-cta__wide">More from&nbsp;</span>
              <span>Hraness</span>
            </a>
            <ThemeMenuButton aria-label="Appearance" />
          </>
        )}
      />
      {askAiPath === undefined ? null : (
        <AskAi className="stripe-history-ask-ai" url={absoluteSiteUrl(askAiPath)} />
      )}
    </>
  );
}
