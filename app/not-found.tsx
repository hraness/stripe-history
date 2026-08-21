import { NOINDEX_ROBOTS } from "@hraness/web-discovery";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

const notFoundTitle = "Page not found";
const notFoundDescription = "The requested Stripe history page does not exist.";

export const metadata: Metadata = {
  title: notFoundTitle,
  description: notFoundDescription,
  robots: NOINDEX_ROBOTS,
};

export default function NotFound() {
  return (
    <main className="plain-page stripedex-main stripedex-state" id="main-content">
      <SiteHeader />
      <section aria-labelledby="not-found-heading" className="stripedex-section">
        <h1 id="not-found-heading">{notFoundTitle}</h1>
        <p>{notFoundDescription}</p>
        <p><Link href="/">Browse Stripe company history</Link></p>
      </section>
      <SiteFooter />
    </main>
  );
}
