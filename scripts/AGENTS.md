# Contents

- `update-sessions-history.ts` – bounded extraction and deduplication of notable Stripe Sessions launches.
- `audit-history-research.ts` – deterministic corpus, coverage, provenance, discovery, and optional external-capture verification.
- `migrate-history-sources.ts` – transactional migration from legacy embedded event sources to the canonical source catalog.
- `gateway.ts` – structured AI Gateway output validation.
- `bounded-http.ts` – response-size and content-type limits.
- `pull-latest-news.ts` – bounded weekly candidate discovery and review-digest generation.
- `auto-publish-history.ts` – dual-pass grounded model review and deterministic history compilation.
- `*.test.ts` – credentials, untrusted input, source inventory, and output-contract regressions.

# Guidelines

- Treat fetched pages and model output as untrusted input. Bound response size, time, output count, and field length before use.
- Require an explicit gateway credential and never persist it or include it in logs.
- Keep the model away from Git, files, and provider credentials. Automatic publication requires a separate grounded fact-check pass, literal evidence quotes, reviewed source and category allowlists, and deterministic compilation before committing.
- Route valuation-only claims, founder-side projects, old events, ambiguous evidence, untrusted-monitor-only candidates, and anything outside the automatic policy to manual review.
- Keep accepted records deterministic and write updates atomically.
- Keep the ordinary research audit self-contained. Require an explicit `--capture-root` before verifying external retained evidence.
- Dry-run legacy source migrations before using `--write`; keep lock ownership and rollback behavior deterministic.
