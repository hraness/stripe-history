# Contents

- `page.tsx` – the canonical unified Stripe history timeline.
- `history/` – category pages, the appearances projection, annual-volume and valuation pages, and shared timeline rendering.
- `data/` – the crawlable history and research dataset index.
- `about/`, `contact/`, and `privacy/` – sourcing, review, independence, corrections, public contact channels, and privacy.
- `llms.txt/` – the agent index with when-to-use guidance.
- Root `proxy.ts` – Accept negotiation that serves Markdown for the same public URLs.
- `site.ts`, `site-copy.ts`, `site-header.tsx`, and `site-footer.tsx` – canonical identity, shared editorial copy, and shared page chrome.
- `analytics.ts`, `posthog.ts`, and `posthog-analytics.tsx` – the finite public-route analytics contract, strict PostHog boundary, and client provider.
- `layout.tsx`, `globals.css`, and `support/` – the document, appearance, structured-data, and portable styling boundaries.
- `robots.ts`, `sitemap.ts`, `manifest.ts`, and `opengraph-image.tsx` – public discovery and sharing surfaces.
- `*.test.ts` and `*.test.tsx` – rendering, redirects, and metadata contracts.

# Guidelines

- Keep the visible domain wordmark lowercase and the human site name `Stripedex`.
- Render history as semantic server output. Keep the root timeline and category pages useful without client-side state.
- Show descriptive source links after every event claim.
- Build all canonical URLs and structured data from `site.ts`.
- Keep raw YAML indexable only as downloadable evidence, not as duplicate search results.
- Keep the Hraness footer attribution and public repository link visible on every rendered page.
- Keep analytics limited to anonymous cookieless `$pageview` events on exact canonical public routes. Drop every other event and property before transport, and never enable analytics outside the `stripedex.com` Production deployment.
