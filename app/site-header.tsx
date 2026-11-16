import { ThemeMenuButton } from "@/support/theme";
import { MarketingSiteHeader } from "@hraness/design-kit/react/server";
import { HRANESS_URL, publicSitePath, site } from "./site";

export const HEADER_CTA_LABEL = "More from Hraness" as const;

/**
 * A compact floating bar: the Hraness lockup links home to hraness.com, the
 * section links stay on Stripe History, and one quiet call to action points
 * to the rest of Hraness before the single appearance control.
 * Native anchors use explicit canonical /stripe paths.
 */
export function SiteHeader({
  aboutSelected = false,
}: Readonly<{ aboutSelected?: boolean }>) {
  return (
    <MarketingSiteHeader
      ariaLabel="primary navigation"
      brand={<span>Hraness</span>}
      brandHref="https://hraness.com"
      brandLabel="Hraness"
      brandMark={publicSitePath("/marks/hraness-ra.svg")}
      className="stripe-history-header hraness-material-chrome"
      links={[
        { href: publicSitePath("/"), label: site.name },
        { href: publicSitePath("/data"), label: "data" },
        { href: publicSitePath("/about"), label: "about", current: aboutSelected },
      ]}
      trailing={(
        <>
          <a
            aria-label={HEADER_CTA_LABEL}
            className="stripe-history-header-cta"
            data-analytics-cta="header-more-from-hraness"
            href={HRANESS_URL}
          >
            <span>More</span>
            <span className="stripe-history-header-cta__wide"> from Hraness</span>
          </a>
          <ThemeMenuButton aria-label="Appearance" />
        </>
      )}
    />
  );
}
