# Contents

- `history/*.yml` – authored category metadata and source-ID-linked events served by the website.
- `research/*.yml` – canonical source, valuation, appearance, collection, and research-run records.

# Guidelines

- Keep one file per canonical category and use the current `stripe-history/history/v2` schema. Treat `stripe-guide/history/v1` only as a legacy migration input.
- Give every event a globally unique stable ID and at least one canonical `source_id` present in `research/sources.yml`.
- Prefer primary sources. Preserve source titles, publishers, publication dates, confidence, valuation basis, and transaction status exactly enough to support each claim.
- Review chronology, duplicates, category placement, and uncertainty before committing data changes.
