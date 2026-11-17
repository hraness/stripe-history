# Contents

- `page.tsx` – the canonical unified Stripe history timeline.
- `history/` – category pages, the appearances projection, annual-volume, annual-revenue, and valuation pages, and shared timeline rendering.
- `x-markdown/` – the Node handler that renders the same public URLs as Markdown.
- `data/` – the crawlable history and research dataset index.
- `about/`, `contact/`, and `privacy/` – sourcing, review, independence, corrections, public contact channels, and privacy.
- `llms.txt/` – the agent index with when-to-use guidance.
- Root `proxy.ts` – Accept negotiation that rewrites Markdown requests to the Node corpus handler. Do not read YAML in the proxy.
- `site.ts`, `site-copy.ts`, `site-header.tsx`, and `site-footer.tsx` – canonical identity, shared editorial copy, the general Hraness newsletter and optional support handoff, and shared page chrome.
- `analytics.ts` and `analytics-client.tsx` – the shared `@hraness/analytics` configuration (identical to hraness.com's) and the browser starter, click reporting, and Your Privacy Choices link.
- `layout.tsx`, `globals.css`, and `support/` – the document, appearance, structured-data, and portable styling boundaries.
- `robots.ts`, `sitemap.ts`, `manifest.ts`, `social.ts`, and `opengraph-image.tsx` – public discovery and sharing surfaces.
- `*.test.ts` and `*.test.tsx` – rendering, redirects, and metadata contracts.

# Guidelines

- Keep the shared marketing header shell with the human site name `Stripe History` as its home brand and the Hraness lockup in the footer, matching the other Hraness product sites.
- Render history as semantic server output. Keep the root timeline and category pages useful without client-side state.
- Show descriptive source links after every event claim.
- Build all canonical URLs and structured data from `site.ts`.
- Keep raw YAML indexable only as downloadable evidence, not as duplicate search results.
- Keep the Hraness footer attribution and public repository link visible on every rendered page.
- Render one shared Hraness footer on every page, with the general `hraness` newsletter audience and optional Hraness support handoff. The owner explicitly selected the general newsletter because this site lives at `hraness.com/stripe`. Do not create a separate Stripe History mailing signup or add a Substack embed. Preserve historical `stripe-history` consent and unsubscribe state in Hraness Accounts without routing new subscriptions there.
- Measure with the shared `@hraness/analytics` marketing preset exactly as hraness.com does: PostHog project 543691, `site_id` `stripe-history`, storage prefix `hraness`, and hraness.com's root `/ph` proxy and `/api/region` endpoint. Do not add a region handler, PostHog host, or build-time analytics key to this app. The shared region table decides what runs: EU/EEA and unknown regions stay cookieless until consent, UK/CH/BR keep analytics on and ask before recordings, the US and the rest of the world are on, and Global Privacy Control turns off recordings. Do not enable ads or a Meta pixel (`onAds`). Keep the Your Privacy Choices footer link on every page, register every event name in `costs.json`, send only bounded labels (ids, kinds, host names), and keep analytics off outside hraness.com (the client checks the host).
- Share images come only from the shared `@hraness/web-discovery` social-image template via the single `defineSocialImageSite` declaration in `social.ts`. Pages pass copy only (`headline`, `description`, `eyebrow`); add no per-site drawing code.
- Keep headings on Funnel Display and ordinary proportional text and the social image on the shared Nebula Sans contract. Reserve monospace for code, dates, and numeric values where alignment needs it.
