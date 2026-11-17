import { ThemeMenuButton } from "@/support/theme";
import * as stylex from "@stylexjs/stylex";
import { AskAi } from "./ask-ai";
import { siteHeaderStyles as styles } from "./site-header.stylex";
import { absoluteSiteUrl, HRANESS_URL, publicSitePath, site, type SitePath } from "./site";

function classNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name.length > 0).join(" ");
}

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
  const links = [
    { href: publicSitePath("/history/valuation"), label: "Valuation", current: valuationSelected },
    { href: publicSitePath("/data"), label: "Data", current: dataSelected },
    { href: publicSitePath("/about"), label: "About", current: aboutSelected },
  ];
  return (
    <>
      <header
        className={classNames("hraness-marketing-header", stylex.props(styles.header).className, "stripe-history-header hraness-material-chrome")}
        data-hraness-marketing="header"
        data-position="sticky"
      >
        <div className={classNames("hraness-marketing-header__inner", stylex.props(styles.header__inner).className)}>
          <a
            className={classNames("hraness-marketing-header__brand", stylex.props(styles.header__brand).className)}
            data-foil=""
            href={publicSitePath("/")}
            aria-label={`${site.name} home`}
          >
            <span>{site.name}</span>
          </a>
          <nav aria-label="primary navigation" className={classNames("hraness-marketing-header__nav", stylex.props(styles.header__nav).className)}>
            {links.map((link) => (
              <a
                aria-current={link.current ? "page" : undefined}
                className={classNames("hraness-marketing-header__link", stylex.props(link.current ? styles.header__linkCurrent : styles.header__link).className)}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className={classNames("hraness-marketing-header__actions", stylex.props(styles.header__actions).className)}>
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
          </div>
        </div>
      </header>
      {askAiPath === undefined ? null : (
        <AskAi className="stripe-history-ask-ai" url={absoluteSiteUrl(askAiPath)} />
      )}
    </>
  );
}
