"use client";

import Link from "next/link";

import { ErrorBoundaryAnalytics } from "./posthog-analytics";

export interface RouteErrorPageProps {
  readonly error: Error & Readonly<{ digest?: string }>;
  readonly reset: () => void;
}

export default function ErrorPage({ error, reset }: RouteErrorPageProps) {
  return (
    <main className="plain-page stripe-history-main stripe-history-state" id="main-content">
      <ErrorBoundaryAnalytics error={error} />
      <h1>Something went wrong</h1>
      <p>The requested Stripe history view could not be rendered.</p>
      <button onClick={reset} type="button">Try again</button>
      <p><Link href="/">Return to Stripe History</Link></p>
    </main>
  );
}
