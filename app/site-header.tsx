import { ThemeMenuButton } from "@/support/theme";
import { HranessBrand } from "@/support/hraness-brand";
import Link from "next/link";

export function SiteHeader({
  aboutSelected = false,
}: Readonly<{ aboutSelected?: boolean }>) {
  return (
    <header className="plain-header stripedex-header">
      <div className="plain-header__inner">
        <HranessBrand className="stripedex-header-brand" />
        <div className="stripedex-header-controls">
          <nav aria-label="primary navigation" className="plain-nav">
            <Link href="/">stripe</Link>
            <Link href="/data">data</Link>
            <Link aria-current={aboutSelected ? "page" : undefined} href="/about">
              about
            </Link>
          </nav>
          <ThemeMenuButton aria-label="Appearance" />
        </div>
      </div>
    </header>
  );
}
