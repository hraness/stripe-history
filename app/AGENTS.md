# Contents

- `page.tsx` – the canonical unified Stripe history timeline.
- `history/` – the legacy redirect, category pages, annual-volume and valuation pages, and shared timeline rendering.
- `data/` – the crawlable history and research dataset index.
- `about/` – sourcing, review, independence, corrections, and privacy.
- `site.ts`, `site-header.tsx`, and `site-footer.tsx` – canonical identity and shared page chrome.
- `layout.tsx`, `globals.css`, and `support/` – the document, appearance, structured-data, and portable styling boundaries.
- `robots.ts`, `sitemap.ts`, `manifest.ts`, and `opengraph-image.tsx` – public discovery and sharing surfaces.
- `*.test.ts` and `*.test.tsx` – rendering, redirects, and metadata contracts.

# Guidelines

- Keep the visible domain wordmark lowercase and the human site name `Stripe History`.
- Render history as semantic server output. Keep the root timeline and category pages useful without client-side state.
- Show descriptive source links after every event claim.
- Build all canonical URLs and structured data from `site.ts`.
- Keep raw YAML indexable only as downloadable evidence, not as duplicate search results.
- Keep the Hraness footer attribution and public repository link visible on every rendered page.
