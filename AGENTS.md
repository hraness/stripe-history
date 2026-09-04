<!-- kb:context scopes/repository--cdb4ee2aea69 -->
# Contents

- `app/` – the public timeline, category, annual-volume, valuation, data, and methodology pages, plus crawl metadata, social image, and framework shell.
- `lib/` – strict history and research YAML contracts with validated content loading.
- `public/history/` – the authored, source-linked Stripe history records.
- `public/research/` – the canonical source catalog, valuations, founder appearances, collection definitions, research-run ledger, and bounded automatic-publication policy and attestations.
- `scripts/` – bounded discovery and publication, Stripe Sessions extraction, research audit and planning, and structured-output helpers.
- `assets/` – the Hraness README lockup.
- `.agents/skills/` – reusable cross-repository KB and phased-execution workflows.
- `kb/` – authored repository rationale, evidence, synthesis, and plans.
- `WRITING.md` and `STYLE.md` – internal and public prose contracts.
- `.github/workflows/` – standalone repository validation.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CITATION.cff`, and `LICENSE` – project documentation, citation metadata, policy, and terms.
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, and `bun.lock` – the standalone Next.js application and verification configuration.

# Guidelines

- Use Bun 1.3.14 for installs, scripts, and checks.
- Follow `WRITING.md` for internal prose and `STYLE.md` for public prose.
- Apply unreasonably robust programming when agent work is cheap. Model invalid states out of existence, parse provider and authored data from `unknown`, and pair readable regression examples with property tests for general laws.
- Deliver completed task-owned changes by fast-forward push to `main` after repository checks, including schemas, public contracts, generated files, lockfiles, and provider configuration. If `main` advances, replay the task-owned commits on the new head and rerun the affected checks. Use a pull request only when the user explicitly asks for one or an external contributor cannot push directly. Never force-push.
- Pin Hraness dependencies to reviewed immutable releases or full commits. Never connect repositories with sibling paths, Git submodules, or coordinated `main` assumptions.
- Use immutable `@hraness/web-discovery` exports for generic metadata and JSON-LD serialization, and `@hraness/vercel-delivery` for the generic Vercel proof and Preview response contract. Keep history semantics, research schemas, redirects, crawl policy, and editorial presentation product-owned.
- Extract a shared package only after two concrete consumers need the same stable interface. Keep shared packages product-neutral.
- Use a shared design kit or `@hraness/ui` only for stable, portable primitives and tokens at an immutable version. Keep evidence modeling, timeline composition, methodology, and the local visual contract product-owned.
- Keep Nebula Sans from the immutable design-kit release as the ordinary proportional face across the timeline shell, assets, and social images. Preserve the explicit monospace heading and data roles.
- Freeze shared interfaces before parallel lanes begin. Give authored-corpus migrations, manifests, lockfiles, and other convergence surfaces one owner while lanes edit disjoint paths.
- Keep mandatory rules in the closest `AGENTS.md`, current procedures in `docs/`, executable contracts in types and tests, and pull-based rationale, evidence, synthesis, and plans in `kb/`.
- Keep the canonical public identity at `https://hraness.com/stripe`. Deploy the application with the `/stripe` base path behind Hraness, and preserve former hosts only as direct permanent redirects to the matching canonical path.
- Treat Production as the only durable Vercel environment. Pull requests may use Vercel's built-in disposable Preview target, but do not create a custom environment, persistent Preview domain, provider-authoritative Preview branch, or separate Preview backend.
- Keep `stripe-history/*` as the stable public schema and prompt-version namespace. Identity changes do not rewrite published data contracts or append-only attestations.
- Keep history server-rendered, crawlable, and available as reviewable YAML. Preserve durable category, annual-volume, valuation, and data URLs.
- Give every ordinary themed page exactly one shared icon-menu appearance control as the final action in its header. Do not put appearance controls in footers, content, or fallback action rows.
- Require at least one canonical source ID for every event and valuation observation. Prefer primary evidence, preserve uncertainty, and distinguish proposed, reported, announced, and completed events.
- Parse every provider response and YAML file from `unknown`. Preserve reverse chronology, globally unique IDs, bounded text, and deterministic source provenance.
- Keep the site independent of Stripe, Inc. Do not imply endorsement, ownership, or official status.
- Keep the Hraness Ra lockup linked to `https://hraness.com/` in the website footer and README.
- Treat this repository as the complete project. Use only its public names, paths, commands, and dependencies.
- Run `bun run check` before handing off a change.

<!-- hra-local-efficiency:start -->
- Treat the user's request to change this repository as standing authorization for routine task-owned commits, pushes, pull requests, merges, releases, deployments, and production verification after the repository's required validation, review, identity, and rollout gates pass. Do not ask for another confirmation at each delivery step.
- Use the repository's documented delivery workflow and preserve every runtime-enforced approval, branch protection, environment rule, safety policy, and final gate. Ask for user input only when delivery needs a material product decision, missing credentials or authority, an irreversibly destructive action outside task scope, or resolution of a release failure that cannot be handled safely and autonomously.
- Prefer short-lived repository workload identities such as OIDC trusted publishing, GitHub Apps, and narrowly scoped machine identities. Do not add long-lived personal tokens, weaken two-factor authentication, or bypass provider controls to eliminate an interactive prompt. Batch unavoidable human-gated production promotions into intentional stable releases while agents publish validated prerelease or beta channels through workload identities when the repository supports them.
- Preserve useful reasoning fan-out, but avoid unnecessary checkout fan-out. Prefer subagents in the current task for bounded research, review, diagnosis, and focused checks when they can safely share one working tree; create a separate task or worktree only for independently deliverable divergent edits, an isolated verification tree, or a different execution environment.
- Give each expensive focused validation command and external wait one owner. The integration owner reviews that evidence and runs the repository-required aggregate or final gate once after convergence. Reuse evidence only for the exact Git tree, command, lockfiles, toolchain, relevant environment, and validity period, and never to skip a required final integration, merge, release, deployment, or production-verification gate.
- On Hraness development machines, use `$hra-local-efficiency` and the installed host scheduler for heavyweight top-level commands when available. Keep ordinary work in the compute lane; give authenticated browser/dev-server/Chromium work one `browser-auth` owner and Mac-only validation one `mac-native` owner.
- When a CI or policy gate scans complete Git history, check out the exact governed SHA and fetch only the fully qualified governed refs before scanning. Preserve the complete-history gate and reject unexpected refs instead of importing unrelated concurrent heads.
- At closeout, record applicable branch, PR, check, merge, release, deployment, and production evidence. Archive only conclusively finished tasks, never from silence alone, and reclaim only freshly revalidated clean merged worktrees through the guarded exact-path flow.
<!-- hra-local-efficiency:end -->
