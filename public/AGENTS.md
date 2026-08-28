# Contents

- `history/*.yml` – authored category metadata and source-ID-linked events served by the website.
- `research/*.yml` – canonical source, valuation, net-revenue, appearance, collection, and research-run records.
- `research/news-monitors.yml` – reviewed first-party, publisher-feed, news-index, and leadership-appearance discovery inputs.
- `research/publication-policy.yml`, `research/automated-decisions.yml`, and `research/automated-publications.yml` – reviewed limits, complete editorial outcomes, and hash-only accepted-publication attestations.

# Guidelines

- Keep one file per canonical category and use the current `stripe-history/history/v2` schema. The namespace remains stable under the Stripe History name. Treat `stripe-guide/history/v1` only as a legacy migration input.
- Give every event a globally unique stable ID and at least one canonical `source_id` present in `research/sources.yml`.
- Prefer primary sources. Preserve source titles, publishers, publication dates, confidence, valuation basis, and transaction status exactly enough to support each claim.
- Review chronology, duplicates, category placement, and uncertainty before committing data changes.
- Keep leadership appearances transcript-grounded. Discover names from the reviewed executive history, preserve exact roles at the time of the appearance, and review summary proposals against complete captures before publication.
- Keep automatic publication and decision history append-only: add a new event, source reference, or decision run; never rewrite or delete an existing claim or outcome. Preserve raw model output outside the public corpus; retain bounded decision reasons, deterministic hashes, and accepted record identity.
