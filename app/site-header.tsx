import { ThemeToggle } from "@/support/theme";
import Link from "next/link";

import { site } from "./site";

export function SiteHeader({
  aboutSelected = false,
  appearancesSelected = false,
}: Readonly<{ aboutSelected?: boolean; appearancesSelected?: boolean }>) {
  return (
    <header className="stripe-history-header">
      <Link className="stripe-history-wordmark" href="/">{site.domain}</Link>
      <div className="stripe-history-header-controls">
        <nav aria-label="Site">
          <Link aria-current={appearancesSelected ? "page" : undefined} href="/appearances">
            appearances
          </Link>
          <Link aria-current={aboutSelected ? "page" : undefined} href="/about">
            about
          </Link>
        </nav>
        <ThemeToggle aria-label="Appearance" />
      </div>
    </header>
  );
}
