"use client";

import type { RouteErrorPageProps } from "./error";

export default function GlobalError({ reset }: RouteErrorPageProps) {
  return (
    <html lang="en-US">
      <body className="plain-site">
        <main className="plain-page stripe-history-main stripe-history-state" id="main-content">
          <h1>Stripe History is temporarily unavailable</h1>
          <p>The site could not finish loading.</p>
          <button onClick={reset} type="button">Try again</button>
        </main>
      </body>
    </html>
  );
}
