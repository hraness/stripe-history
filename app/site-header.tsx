import { ThemeToggle } from "@/support/theme";
import Link from "next/link";

import { site } from "./site";

export function SiteHeader({
  aboutSelected = false,
}: Readonly<{ aboutSelected?: boolean }>) {
  return (
    <header className="stripe-history-header">
      <p className="stripe-history-wordmark"><Link href="/">{site.domain}</Link></p>
      <div className="stripe-history-header-controls">
        <nav aria-label="Site">
          <Link aria-current={aboutSelected ? "page" : undefined} href="/about">
            about
          </Link>
        </nav>
        <ThemeToggle aria-label="Appearance" />
      </div>
    </header>
  );
}
