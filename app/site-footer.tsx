import { HranessBrand } from "@/support/hraness-brand";
import { ThemeToggle } from "@/support/theme";

import { GITHUB_REPOSITORY_URL } from "./site";

export function SiteFooter() {
  return (
    <footer className="plain-footer stripe-guide-footer">
      <HranessBrand />
      <div className="plain-footer__links">
        <a href="/data">data</a>
        <a href="/about">about</a>
        <a href={GITHUB_REPOSITORY_URL}>github</a>
        <ThemeToggle aria-label="Appearance" />
      </div>
    </footer>
  );
}
