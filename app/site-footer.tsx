import { HranessBrand } from "@/support/hraness-brand";

import { GITHUB_REPOSITORY_URL } from "./site";

export function SiteFooter() {
  return (
    <footer className="plain-footer stripedex-footer">
      <HranessBrand className="stripedex-footer-hraness" />
      <div className="plain-footer__links">
        <a href="/data">data</a>
        <a href="/about">about</a>
        <a href={GITHUB_REPOSITORY_URL}>github</a>
      </div>
    </footer>
  );
}
