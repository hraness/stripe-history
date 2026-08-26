import { HranessBrand } from "@/support/hraness-brand";

import { GITHUB_REPOSITORY_URL, publicSitePath } from "./site";

export function SiteFooter() {
  return (
    <footer className="plain-footer stripedex-footer">
      <HranessBrand className="stripedex-footer-hraness" />
      <div className="plain-footer__links">
        <a href={publicSitePath("/data")}>data</a>
        <a href={publicSitePath("/about")}>about</a>
        <a href={publicSitePath("/contact")}>contact</a>
        <a href={publicSitePath("/privacy")}>privacy</a>
        <a href={GITHUB_REPOSITORY_URL}>github</a>
      </div>
    </footer>
  );
}
