import { ThemeMenuButton } from "@/support/theme";
import Link from "next/link";

import { site } from "./site";

export function SiteHeader({
  aboutSelected = false,
}: Readonly<{ aboutSelected?: boolean }>) {
  return (
    <header className="stripedex-header">
      <Link className="stripedex-wordmark" href="/">{site.domain}</Link>
      <div className="stripedex-header-controls">
        <nav aria-label="Site">
          <Link aria-current={aboutSelected ? "page" : undefined} href="/about">
            about
          </Link>
        </nav>
        <ThemeMenuButton aria-label="Appearance" />
      </div>
    </header>
  );
}
