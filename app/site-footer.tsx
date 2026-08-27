import { HranessSiteFooter } from "@hraness/site-footer/react";

import { GITHUB_REPOSITORY_URL, publicSitePath } from "./site";

export function SiteFooter() {
  return (
    <>
      <aside aria-label="Stripedex resources" className="stripedex-footer-resources">
        <p className="stripedex-footer-resources__label">Stripedex</p>
        <nav aria-label="Stripedex links" className="stripedex-footer-resources__links">
          <a href={publicSitePath("/data")}>data</a>
          <a href={publicSitePath("/about")}>about</a>
          <a href={publicSitePath("/contact")}>contact</a>
          <a href={publicSitePath("/privacy")}>privacy</a>
          <a href={GITHUB_REPOSITORY_URL}>github</a>
        </nav>
      </aside>
      <HranessSiteFooter />
    </>
  );
}
