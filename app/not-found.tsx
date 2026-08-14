import Link from "next/link";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export default function NotFound() {
  return (
    <main className="plain-page stripe-history-main stripe-history-state" id="main-content">
      <SiteHeader />
      <section aria-labelledby="not-found-heading" className="stripe-history-section">
        <h1 id="not-found-heading">Page not found</h1>
        <p>The requested Stripe history page does not exist.</p>
        <p><Link href="/">Browse Stripe company history</Link></p>
      </section>
      <SiteFooter />
    </main>
  );
}
