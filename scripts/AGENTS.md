# Contents

- `update-sessions-history.ts` – bounded extraction and deduplication of notable Stripe Sessions launches.
- `gateway.ts` – structured AI Gateway output validation.
- `bounded-http.ts` – response-size and content-type limits.
- `*.test.ts` – credentials, untrusted input, source inventory, and output-contract regressions.

# Guidelines

- Treat fetched pages and model output as untrusted input. Bound response size, time, output count, and field length before use.
- Require an explicit gateway credential and never persist it or include it in logs.
- Review every proposed history change and its cited evidence before committing it.
- Keep accepted records deterministic and write updates atomically.
