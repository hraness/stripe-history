import { ThemeMenuButton } from "@/support/theme";
import { RaMark } from "@/support/hraness-brand";
import Link from "next/link";

/**
 * The shared Hraness header on the design-kit marketing header treatment:
 * sticky, translucent paper, one hairline. The markup follows the documented
 * `hraness-marketing-header` classes directly so internal links stay on
 * `next/link` and receive the `/stripe` base path.
 */
export function SiteHeader({
  aboutSelected = false,
}: Readonly<{ aboutSelected?: boolean }>) {
  return (
    <header
      className="hraness-marketing-header stripe-history-header"
      data-hraness-marketing="header"
    >
      <div className="hraness-marketing-header__inner">
        <a
          aria-label="hraness"
          className="hraness-marketing-header__brand stripe-history-header-brand"
          href="https://hraness.com"
        >
          <RaMark />
          <span>hraness</span>
        </a>
        <nav aria-label="primary navigation" className="hraness-marketing-header__nav">
          <Link href="/">stripe</Link>
          <Link href="/data">data</Link>
          <Link aria-current={aboutSelected ? "page" : undefined} href="/about">
            about
          </Link>
        </nav>
        <div className="hraness-marketing-header__actions">
          <ThemeMenuButton aria-label="Appearance" />
        </div>
      </div>
    </header>
  );
}
