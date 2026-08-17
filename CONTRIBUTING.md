# Contributing

Corrections, stronger sources, missing events, and focused software improvements are welcome.

For a history change, include the event date, a concise factual claim, its category, the proposed confidence and status, and at least one source URL. Prefer primary sources. If a claim is reported or proposed rather than completed, preserve that uncertainty in both the record and summary.

Keep event IDs stable after publication unless the ID itself is incorrect. Check for an existing record before adding a new one, and explain possible duplicates in the pull request.

The weekly publisher is append-only and intentionally narrow. Corrections, valuation research, founder side projects, historical backfill, model-rejected candidates, and any rewrite or deletion still belong in an ordinary reviewed contribution. Do not commit model transcripts or copyrighted article bodies; accepted automated records retain source identity and hash-only evidence attestations.

Run the local checks before opening a pull request:

```sh
bun install --frozen-lockfile
bun run check
```

Use an issue for a correction that needs discussion or for a broad schema, editorial, or compatibility proposal. Do not include private, embargoed, or unlawfully obtained material.
