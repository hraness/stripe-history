import { NOINDEX_ROBOTS } from "@hraness/web-discovery";
import type { Metadata } from "next";
import Link from "next/link";

import { PageNotFoundAnalytics } from "./analytics-client";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import {
  notFoundDescription,
  notFoundTitle,
  recoveryLinks,
} from "./site-copy";
import { appPathFromPublicSitePath } from "./site";

export const metadata: Metadata = {
  title: notFoundTitle,
  description: notFoundDescription,
  robots: NOINDEX_ROBOTS,
};

export default function NotFound() {
  return (
    <main className="plain-page stripe-history-main stripe-history-state" id="main-content">
      <PageNotFoundAnalytics />
      <SiteHeader />
      <section aria-labelledby="not-found-heading" className="stripe-history-section">
        <h1 id="not-found-heading">{notFoundTitle}</h1>
        <p>{notFoundDescription}</p>
        <p>Continue from:</p>
        <ul>
          {recoveryLinks.map((link) => {
            const path = new URL(link.href).pathname;
            return (
              <li key={link.href}>
                {/* llms.txt and the sitemap are files, not pages. A plain link fetches them directly; the
                    router would first ask production for their page data, which it answers with an error. */}
                {/\.[a-z]+$/u.test(path) ? (
                  <a href={path}>{link.label}</a>
                ) : (
                  <Link href={appPathFromPublicSitePath(path) ?? "/"}>{link.label}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <SiteFooter />
    </main>
  );
}
