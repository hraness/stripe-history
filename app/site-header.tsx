import { ThemeMenuButton } from "@/support/theme";
import { MarketingSiteHeader } from "@hraness/design-kit/react/server";
import { publicSitePath, site } from "./site";

/**
 * Shared compiled slots; native anchors use explicit canonical /stripe paths.
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
      trailing={<ThemeMenuButton aria-label="Appearance" />}
    />
  );
}
