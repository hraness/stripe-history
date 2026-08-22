# Contents

- `history-schema.ts` – strict schemas and public history types.
- `research-schema.ts` and `research-source-identity.ts` – strict provenance, valuation, appearance, collection, and run contracts with stable source identity.
- `automated-publication-schema.ts` – reviewed model policy and hash-only publication attestation contracts.
- `content.ts` – deterministic loading, source resolution, validation, categorization, chronology, annual-volume extraction, and valuation selection.
- `accept.ts` – Accept parsing and markdown negotiation decisions.
- `history-urls.ts` – durable category, event, and internal Markdown rewrite paths.
- `page-markdown.ts` and `llms-txt.ts` – Markdown representations of existing public pages and the agent index.
- `*.test.ts` – schema, ordering, uniqueness, and source-provenance regressions.

# Guidelines

- Parse YAML from `unknown` and reject invalid categories, dates, confidence values, duplicate IDs, unknown source IDs, missing sources, and malformed URLs.
- Keep one canonical category identifier per file and preserve deterministic reverse chronology.
- Add readable regression examples for schema changes and malformed foreign input.
