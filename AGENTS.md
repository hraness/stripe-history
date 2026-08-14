# Contents

- `app/` – the public timeline, category, annual-volume, valuation, data, and methodology pages, plus crawl metadata, social image, and framework shell.
- `lib/` – strict history and research YAML contracts with validated content loading.
- `public/history/` – the authored, source-linked Stripe history records.
- `public/research/` – the canonical source catalog, valuations, founder appearances, collection definitions, and research-run ledger.
- `scripts/` – bounded Stripe Sessions extraction, research audit and planning, legacy-source migration, and structured-output helpers.
- `assets/` – the Hraness README lockup.
- `.github/workflows/` – standalone repository validation.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CITATION.cff`, and `LICENSE` – project documentation, citation metadata, policy, and terms.
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, and `bun.lock` – the standalone Next.js application and verification configuration.

# Guidelines

- Use Bun 1.3.14 for installs, scripts, and checks.
- Keep the canonical public identity at `https://stripehistory.com`. Preserve former hosts only as direct permanent redirects to the matching canonical path.
- Keep history server-rendered, crawlable, and available as reviewable YAML. Preserve durable category, annual-volume, valuation, and data URLs.
- Require at least one canonical source ID for every event and valuation observation. Prefer primary evidence, preserve uncertainty, and distinguish proposed, reported, announced, and completed events.
- Parse every provider response and YAML file from `unknown`. Preserve reverse chronology, globally unique IDs, bounded text, and deterministic source provenance.
- Keep the site independent of Stripe, Inc. Do not imply endorsement, ownership, or official status.
- Keep the Hraness Ra lockup linked to `https://hraness.com/` in the website footer and README.
- Treat this repository as the complete project. Use only its public names, paths, commands, and dependencies.
- Run `bun run check` before handing off a change.
