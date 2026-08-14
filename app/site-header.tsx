import Link from "next/link";

import { site } from "./site";

export function SiteHeader() {
  return (
    <header className="stripe-guide-header">
      <p className="stripe-guide-wordmark"><Link href="/">{site.domain}</Link></p>
    </header>
  );
}
