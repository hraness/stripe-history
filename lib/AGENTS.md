# Contents

- `history-schema.ts` – strict schemas and public History types.
- `content.ts` – deterministic loading, validation, categorization, and chronology.
- `*.test.ts` – schema, ordering, uniqueness, and source-provenance regressions.

# Guidelines

- Parse YAML from `unknown` and reject invalid categories, dates, confidence values, duplicate IDs, missing sources, and malformed URLs.
- Keep one canonical category identifier per file and preserve deterministic reverse chronology.
- Add readable regression examples for schema changes and malformed foreign input.
