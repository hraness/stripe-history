---
title: Repository seams
type: concept
tags:
  - architecture
  - dependencies
  - repositories
repository_scopes:
  - AGENTS.md
  - package.json
---

# Repository seams

Stripe History owns its source-linked history records, research catalog, chronology rules, methodology, and public presentation. The evidence corpus and the product-specific views that explain it remain local even when stable visual primitives are shared.

The public `stripe-history/*` schemas and prompt-version identifiers remain stable compatibility contracts. Existing attestations, research ledgers, recorded capture slugs, and GitHub Actions artifact URLs keep their historical identities even when current product and operational identifiers change.

The app currently declares no Hraness package dependency. If it adopts a shared design kit or `@hraness/ui`, pin an immutable release and limit the dependency to stable, portable primitives and tokens. Keep evidence modeling, timeline composition, methodology, and research workflows product-owned.

Do not connect development through sibling paths, Git submodules, or coordinated `main` workflows. Extract a shared package only after two concrete consumers need the same stable, product-neutral interface. Freeze content and UI contracts before parallel lanes and give authored corpus migrations, manifests, and other convergence files one owner.

## Related

The normative rules remain in the root `AGENTS.md`. [[documentation-ownership|Documentation ownership]] explains how those rules relate to executable contracts and this pull-based context.
