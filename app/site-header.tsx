import { ThemeMenuButton } from "@/support/theme";
import { RaMark } from "@/support/hraness-brand";
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
      brand={<><RaMark /><span>hraness</span></>}
      brandHref="https://hraness.com"
      brandLabel="hraness"
      className="stripe-history-header"
      links={[
        { href: publicSitePath("/"), label: "stripe" },
        { href: publicSitePath("/data"), label: "data" },
        { href: publicSitePath("/about"), label: "about", current: aboutSelected },
      ]}
      trailing={<ThemeMenuButton aria-label="Appearance" />}
    />
  );
}
