import { ThemeMenuButton } from "@/support/theme";
import { MarketingSiteHeader } from "@hraness/design-kit/react/server";
import { publicSitePath } from "./site";

/**
 * Shared compiled slots; native anchors use explicit canonical /stripe paths.
 */
export function SiteHeader({
  aboutSelected = false,
}: Readonly<{ aboutSelected?: boolean }>) {
  return (
    <MarketingSiteHeader
      ariaLabel="primary navigation"
      brand={<span>hraness</span>}
      brandHref="https://hraness.com"
      brandLabel="hraness"
      brandMark={publicSitePath("/marks/hraness-ra.svg")}
      className="stripe-history-header hraness-material-chrome"
      links={[
        { href: publicSitePath("/"), label: "stripe history" },
        { href: publicSitePath("/data"), label: "data" },
        { href: publicSitePath("/about"), label: "about", current: aboutSelected },
      ]}
      trailing={<ThemeMenuButton aria-label="Appearance" />}
    />
  );
}
