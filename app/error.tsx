"use client";

import Link from "next/link";

export interface RouteErrorPageProps {
  readonly error: Error & Readonly<{ digest?: string }>;
  readonly reset: () => void;
}

export default function ErrorPage({ reset }: RouteErrorPageProps) {
  return (
    <main className="plain-page stripedex-main stripedex-state" id="main-content">
      <h1>Something went wrong</h1>
      <p>The requested Stripe history view could not be rendered.</p>
      <button onClick={reset} type="button">Try again</button>
      <p><Link href="/">Return to Stripe company history</Link></p>
    </main>
  );
}
