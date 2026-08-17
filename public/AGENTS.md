# Contents

- `history/*.yml` – authored category metadata and source-ID-linked events served by the website.
- `research/*.yml` – canonical source, valuation, appearance, collection, and research-run records.
- `research/news-monitors.yml` – reviewed first-party, publisher-feed, and news-index discovery inputs.
- `research/publication-policy.yml` and `research/automated-publications.yml` – reviewed automatic-publication limits and hash-only model/evidence attestations.

# Guidelines

- Keep one file per canonical category and use the current `stripe-history/history/v2` schema. Treat `stripe-guide/history/v1` only as a legacy migration input.
- Give every event a globally unique stable ID and at least one canonical `source_id` present in `research/sources.yml`.
- Prefer primary sources. Preserve source titles, publishers, publication dates, confidence, valuation basis, and transaction status exactly enough to support each claim.
- Review chronology, duplicates, category placement, and uncertainty before committing data changes.
- Keep automatic publication append-only: add a new event or a new source reference, never rewrite or delete an existing claim. Preserve raw model output outside the public corpus; retain only deterministic hashes and accepted record identity.
