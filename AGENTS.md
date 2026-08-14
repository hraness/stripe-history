# Contents

- `app/` – the public timeline, category and annual-volume pages, methodology, crawl metadata, social image, and framework shell.
- `lib/` – strict History YAML contracts and validated content loading.
- `public/history/` – the authored, source-linked Stripe history records.
- `scripts/` – bounded Stripe Sessions extraction and structured-output helpers.
- `assets/` – the Hraness README lockup.
- `.github/workflows/` – standalone repository validation.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CITATION.cff`, and `LICENSE` – project documentation, citation metadata, policy, and terms.
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, and `bun.lock` – the standalone Next.js application and verification configuration.

# Guidelines

- Use Bun 1.3.14 for installs, scripts, and checks.
- Keep the canonical public identity at `https://stripehistory.com`. Preserve former hosts only as direct permanent redirects to the matching canonical path.
- Keep History server-rendered, crawlable, and available as reviewable YAML. Preserve durable category and annual-volume URLs.
- Require at least one source for every event. Prefer primary evidence, preserve uncertainty, and distinguish proposed, reported, announced, and completed events.
- Parse every provider response and YAML file from `unknown`. Preserve reverse chronology, globally unique IDs, bounded text, and deterministic source provenance.
- Keep the site independent of Stripe, Inc. Do not imply endorsement, ownership, or official status.
- Keep the Hraness Ra lockup linked to `https://hraness.com/` in the website footer and README.
- Treat this repository as the complete project. Use only its public names, paths, commands, and dependencies.
- Run `bun run check` before handing off a change.
