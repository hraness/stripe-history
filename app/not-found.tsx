import { NOINDEX_ROBOTS } from "@hraness/web-discovery";
import type { Metadata } from "next";
import Link from "next/link";

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
    <main className="plain-page stripedex-main stripedex-state" id="main-content">
      <SiteHeader />
      <section aria-labelledby="not-found-heading" className="stripedex-section">
        <h1 id="not-found-heading">{notFoundTitle}</h1>
        <p>{notFoundDescription}</p>
        <p>Continue from:</p>
        <ul>
          {recoveryLinks.map((link) => (
            <li key={link.href}>
              <Link href={appPathFromPublicSitePath(new URL(link.href).pathname) ?? "/"}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
    </main>
  );
}
