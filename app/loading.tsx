import { SiteHeader } from "./site-header";

export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="plain-page stripedex-main stripedex-state"
      id="main-content"
    >
      <SiteHeader />
      <p role="status">Loading Stripe company history…</p>
    </main>
  );
}
