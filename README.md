# Stripe History

[stripehistory.com](https://stripehistory.com/) is an independent, open-source timeline of Stripe company history, with sourced data on products, acquisitions, funding, valuation, leadership, expansion, milestones, and annual payment volume.

The site renders more than 200 sourced events as one reverse-chronological history and as focused, crawlable category pages. It also presents sourced annual payment-volume and private-company valuation records. Each claim retains reviewable YAML provenance, including status and uncertainty where they apply.

## Browse the history

- [Complete Stripe company history](https://stripehistory.com/)
- [Acquisitions](https://stripehistory.com/history/acquisitions)
- [Product launches](https://stripehistory.com/history/product-launches)
- [Fundraising](https://stripehistory.com/history/fundraising)
- [Company milestones](https://stripehistory.com/history/company-milestones)
- [Annual payment and total volume](https://stripehistory.com/history/payment-volume)
- [Private-company valuation history](https://stripehistory.com/history/valuation)
- [Open history and research data](https://stripehistory.com/data)

## Questions the history answers

- [How did Stripe start, and who formed its earliest team?](https://stripehistory.com/history/origins-and-early-company)
- [What companies has Stripe acquired?](https://stripehistory.com/history/acquisitions)
- [How have Stripe's funding and private-company valuation changed?](https://stripehistory.com/history/valuation)
- [How much annual payment and total volume has Stripe disclosed?](https://stripehistory.com/history/payment-volume)
- [When did Stripe launch products and expand into new countries?](https://stripehistory.com/history/product-launches)
- [How have Stripe's payment methods, settlement rails, and payout reach expanded?](https://stripehistory.com/history/payment-and-payout-expansion)

The authored event records live in [`public/history/`](./public/history/), one file per category. The [`public/research/`](./public/research/) directory contains the canonical source catalog, valuation observations, founder appearances, collection definitions, research-run ledger, automatic-publication policy, complete automated decision history, and accepted publication attestations. They remain ordinary YAML so corrections and provenance changes are readable in review without scraping the site.

## Sources and editorial method

Entries prefer primary sources and strong contemporaneous reporting. Review checks chronology, source support, category placement, and duplicate claims. The records preserve distinctions between announced, offered, reported, and completed events instead of converting uncertainty into fact.

Run the deterministic research-corpus audit with:

```sh
bun run history:research:audit
```

An external capture archive can be verified with `bun run history:research:audit -- --capture-root /absolute/path`. Capture planning is read-only; pass a collection and explicit date as needed, for example `bun run history:research:plan -- --collection valuation-history --as-of 2026-08-14`.

The [weekly history publication workflow](./.github/workflows/weekly-news.yml) runs every Thursday at 9:17 AM Atlantic time. It checks Stripe's first-party newsroom and blog indexes, focused publisher feeds, and bounded GDELT searches, then removes URLs already present in the source catalog.

Up to three current company-history candidates receive bounded triage from [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) at `max` reasoning effort. Candidates from reviewed first-party or publisher-feed monitors can continue to an independent structured review. The model never receives Git credentials, shell access, or file tools. A deterministic compiler can only add one new event or append one source reference inside the categories allowed by [`publication-policy.yml`](./public/research/publication-policy.yml). It requires exact source-text quotes, preserves reporting uncertainty, records hash-only evidence and model attestations, and caps each run at two published changes. Reports from other monitors can identify corroboration, but cannot change the published corpus automatically.

Every outcome, including rejections and corroborating duplicates, is appended to [`automated-decisions.yml`](./public/research/automated-decisions.yml). Accepted changes retain the stronger evidence attestation in [`automated-publications.yml`](./public/research/automated-publications.yml). One rolling GitHub issue contains only unresolved decisions such as ambiguous evidence, out-of-policy claims, capacity deferrals, or infrastructure errors; the workflow closes it when the queue is empty. Accepted changes and decision-ledger updates must pass strict YAML schemas, the research audit, the full repository check, a production build, and a generated-diff allowlist. The workflow commits only those data files and pushes only when its checkout is still a direct fast-forward of `main`.

Automatic publication requires a Vercel AI Gateway key stored as the GitHub Actions secret `STRIPE_HISTORY_LLM_API_KEY`. Create the key in the [AI Gateway API Keys page](https://vercel.com/docs/ai-gateway/authentication-and-byok), then add it to the repository without placing it in source or logs. The optional `EXA_API_KEY` GitHub Actions secret enables the checked, domain-restricted Exa discovery monitor; direct publisher evidence still comes from each result's canonical source. The checked policy bounds model calls and output size; review provider usage and spending separately.

Run the same discovery locally with an explicit date:

```sh
bun run history:news:pull -- --as-of 2026-08-20 --json-out /tmp/stripe-news.json --markdown-out /tmp/stripe-news.md
```

Preview model decisions without editing the corpus by omitting `--write`:

```sh
STRIPE_HISTORY_LLM_API_KEY=... bun run history:publish:auto -- --digest /tmp/stripe-news.json --json-out /tmp/stripe-publication.json --markdown-out /tmp/stripe-publication.md
```

The scheduled workflow is the publication owner. Local `--write` is intended only for deterministic fixture work or a reviewed recovery, not a second concurrent publisher.

Read the full [methodology and independence statement](https://stripehistory.com/about).

## Run locally

Use [Bun 1.3.14](https://bun.sh/):

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. Run the complete local verification before submitting a change:

```sh
bun run check
```

After a production update is live, notify IndexNow of the canonical HTML URLs in the sitemap:

```sh
bun run search:indexnow -- --submit
```

Run the same command without `--submit` to inspect the exact payload. The command rejects duplicate, non-HTTPS, off-domain, and noncanonical URLs before making a request.

The optional `bun run history:sessions:update` command re-extracts notable product launches from the checked Stripe Sessions source set. It requires `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`; review every proposed record and source before committing it. The migration command rewrites legacy embedded sources and should be used only on a reviewed legacy corpus after a dry run of `bun run scripts/migrate-history-sources.ts`.

## Corrections and contributions

Corrections, additional primary sources, and focused improvements are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or pull request.

## Independence

Stripe History is not affiliated with, endorsed by, or operated by Stripe, Inc. Stripe names and trademarks belong to their respective owners.

## License

Code and authored history data in this repository are available under the [MIT License](./LICENSE).

[![Hraness](./assets/hraness-wordmark-dark.svg#gh-light-mode-only)](https://hraness.com/)
[![Hraness](./assets/hraness-wordmark-light.svg#gh-dark-mode-only)](https://hraness.com/)
