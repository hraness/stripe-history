# Contents

- `update-sessions-history.ts` – bounded extraction and deduplication of notable Stripe Sessions launches.
- `audit-history-research.ts` – deterministic corpus, coverage, provenance, discovery, and optional external-capture verification.
- `gateway.ts` – structured AI Gateway output validation.
- `bounded-http.ts` – response-size and content-type limits.
- `pull-latest-news.ts` – bounded weekly candidate discovery and review-digest generation.
- `auto-publish-history.ts` – dual-pass grounded model review and deterministic history compilation.
- `*.test.ts` – credentials, untrusted input, source inventory, and output-contract regressions.

# Guidelines

- Treat fetched pages and model output as untrusted input. Bound response size, time, output count, and field length before use.
- Require an explicit gateway credential and never persist it or include it in logs.
- Keep the model away from Git, files, and provider credentials. Automatic publication requires a separate grounded fact-check pass, literal evidence quotes, reviewed source and category allowlists, and deterministic compilation before committing.
- Route valuation-only claims, leadership appearances, old events, ambiguous evidence, untrusted-monitor-only candidates, and anything outside the automatic policy to manual review. Launched founder side-quest projects from trusted monitors may publish into `side-quests` when they otherwise match policy.
- Keep accepted records deterministic and write updates atomically.
- Keep the ordinary research audit self-contained. Require an explicit `--capture-root` before verifying external retained evidence.
- Do not restore the retired embedded-source migrator. The published corpus is source-ID-only; strict history and research schemas, catalog resolution, and the corpus audit are its continuing executable boundary.
