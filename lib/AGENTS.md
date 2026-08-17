# Contents

- `history-schema.ts` – strict schemas and public history types.
- `research-schema.ts` and `research-source-identity.ts` – strict provenance, valuation, appearance, collection, and run contracts with stable source identity.
- `automated-publication-schema.ts` – reviewed model policy and hash-only publication attestation contracts.
- `content.ts` – deterministic loading, source resolution, validation, categorization, chronology, annual-volume extraction, and valuation selection.
- `*.test.ts` – schema, ordering, uniqueness, and source-provenance regressions.

# Guidelines

- Parse YAML from `unknown` and reject invalid categories, dates, confidence values, duplicate IDs, unknown source IDs, missing sources, and malformed URLs.
- Keep one canonical category identifier per file and preserve deterministic reverse chronology.
- Add readable regression examples for schema changes and malformed foreign input.
