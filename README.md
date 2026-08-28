# Stripe History

[Stripe History on Hraness](https://hraness.com/stripe) is an independent, open-source timeline of Stripe company history, with sourced data on products, acquisitions, funding, valuation, leadership, expansion, milestones, and annual payment volume.

The site renders more than 200 sourced events as one reverse-chronological history and as focused, crawlable category pages. It also presents sourced annual payment-volume, net-revenue, and private-company valuation records. Each claim retains reviewable YAML provenance, including status and uncertainty where they apply.

## Browse the history

- [Complete Stripe company history](https://hraness.com/stripe)
- [Acquisitions](https://hraness.com/stripe/history/acquisitions)
- [Product launches](https://hraness.com/stripe/history/product-launches)
- [Fundraising](https://hraness.com/stripe/history/fundraising)
- [Company milestones](https://hraness.com/stripe/history/company-milestones)
- [Annual payment and total volume](https://hraness.com/stripe/history/payment-volume)
- [Annual net revenue and revenue](https://hraness.com/stripe/history/net-revenue)
- [Private-company valuation history](https://hraness.com/stripe/history/valuation)
- [Stripe leadership appearances](https://hraness.com/stripe/history/appearances)
- [Open history and research data](https://hraness.com/stripe/data)

## Questions the history answers

- [How did Stripe start, and who formed its earliest team?](https://hraness.com/stripe/history/origins-and-early-company)
- [What companies has Stripe acquired?](https://hraness.com/stripe/history/acquisitions)
- [How have Stripe's funding and private-company valuation changed?](https://hraness.com/stripe/history/valuation)
- [How much annual payment and total volume has Stripe disclosed?](https://hraness.com/stripe/history/payment-volume)
- [What sourced net-revenue figures exist?](https://hraness.com/stripe/history/net-revenue)
- [When did Stripe launch products and expand into new countries?](https://hraness.com/stripe/history/product-launches)
- [How have Stripe's payment methods, settlement rails, and payout reach expanded?](https://hraness.com/stripe/history/payment-and-payout-expansion)

The authored event records live in [`public/history/`](./public/history/), one file per category. Annual volume and net-revenue disclosures sit on those events. The [`public/research/`](./public/research/) directory contains the canonical source catalog, valuation observations, leadership appearances, collection definitions, research-run ledger, automatic-publication policy, complete automated decision history, and accepted publication attestations. They remain ordinary YAML so corrections and provenance changes are readable in review without scraping the site.

## Sources and editorial method

Entries prefer primary sources and strong contemporaneous reporting. Review checks chronology, source support, category placement, and duplicate claims. The records preserve distinctions between announced, offered, reported, and completed events instead of converting uncertainty into fact.

Run the deterministic research-corpus audit with:

```sh
bun run history:research:audit
```

An external capture archive can be verified with `bun run history:research:audit -- --capture-root /absolute/path`. Capture planning is read-only; pass a collection and explicit date as needed, for example `bun run history:research:plan -- --collection valuation-history --as-of 2026-08-14`.

The [weekly history publication workflow](./.github/workflows/weekly-news.yml) runs every Thursday at 9:17 AM Atlantic time. It checks Stripe's first-party newsroom index, first-party blog and publication RSS feeds, focused publisher feeds, bounded GDELT searches, and a domain-restricted Exa search for long-form leadership appearances, then removes URLs already present in the source catalog. Appearance identities are derived from the reviewed people in the executive history rather than maintained as a second hard-coded roster. Appearance candidates remain review-only.

Up to three current company-history candidates receive bounded triage from [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) at `max` reasoning effort. Candidates from reviewed first-party or publisher-feed monitors can continue to an independent structured review. The model never receives Git credentials, shell access, or file tools. A deterministic compiler can only add one new event or append one source reference inside the categories allowed by [`publication-policy.yml`](./public/research/publication-policy.yml). It requires exact source-text quotes, preserves reporting uncertainty, records hash-only evidence and model attestations, and caps each run at two published changes. Reports from other monitors can identify corroboration, but cannot change the published corpus automatically.

Every outcome, including rejections and corroborating duplicates, is appended to [`automated-decisions.yml`](./public/research/automated-decisions.yml). Accepted changes retain the stronger evidence attestation in [`automated-publications.yml`](./public/research/automated-publications.yml). A terminal ledger decision prevents the same URL from consuming model capacity again. One rolling GitHub issue contains only unresolved decisions such as ambiguous evidence, out-of-policy claims, capacity deferrals, or infrastructure errors; the workflow closes it when the queue is empty. Accepted changes and decision-ledger updates must pass strict YAML schemas, the research audit, the full repository check, a production build, and a generated-diff allowlist. The workflow commits only those data files when its checkout is still a direct child of current `main`, fast-forward pushes that exact commit to `main`, then explicitly dispatches and waits for exact-head repository CI because events created by the workflow token do not recursively start workflows. Repository checks remain the publication authority.

Automatic publication requires a Vercel AI Gateway key. The workflow exposes the sealed GitHub Actions secret as `STRIPE_HISTORY_LLM_API_KEY`. Create replacement keys in the [AI Gateway API Keys page](https://vercel.com/docs/ai-gateway/authentication-and-byok), then store them without placing credentials in source or logs. The optional `EXA_API_KEY` GitHub Actions secret enables the checked, domain-restricted Exa discovery monitor; direct publisher evidence still comes from each result's canonical source. The checked policy bounds model calls and output size; review provider usage and spending separately.

Run the same discovery locally with an explicit date:

```sh
bun run history:news:pull -- --as-of 2026-08-20 --json-out /tmp/stripe-news.json --markdown-out /tmp/stripe-news.md
```

The manual [leadership appearance backfill](./.github/workflows/appearance-backfill.yml) searches one bounded calendar window at a time from 2009 onward and uploads a private review artifact. It does not edit public data or open issues. Reviewers deduplicate the artifact, capture the retained sources, and merge only evidence-backed records into the main [leadership appearances](https://hraness.com/stripe/history/appearances) timeline category. The same window can be inspected locally:

```sh
bun run history:news:pull -- --from 2020-01-01 --as-of 2020-12-31 --monitor exa-stripe-leadership-appearances --json-out /tmp/stripe-appearances-2020.json --markdown-out /tmp/stripe-appearances-2020.md
```

After capturing and reviewing a candidate's complete transcript in Jungle's KB, generate a grounded digest proposal with the strong-model summarizer:

```sh
STRIPE_HISTORY_LLM_API_KEY=... bun run history:appearances:summarize -- --capture /absolute/path/to/capture.md --json-out /tmp/appearance-summary.json
```

The summarizer uses `openai/gpt-5.6-sol` at `max` reasoning by default, emits a Reading-style gist and three to five ideas, and fails unless every private audit quote is an exact 6–25-word transcript passage. It never edits the appearance corpus. A reviewer reconciles the proposed digest, participant role, date, canonical source, and transcript status before adding YAML and a research-run decision.

Preview model decisions without editing the corpus by omitting `--write`:

```sh
STRIPE_HISTORY_LLM_API_KEY=... bun run history:publish:auto -- --digest /tmp/stripe-news.json --json-out /tmp/stripe-publication.json --markdown-out /tmp/stripe-publication.md
```

The scheduled workflow is the publication owner. Local `--write` is intended only for deterministic fixture work or a reviewed recovery, not a second concurrent publisher.

Read the full [methodology and independence statement](https://hraness.com/stripe/about).

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

The optional `bun run history:sessions:update` command re-extracts notable product launches from the checked Stripe Sessions source set. It requires `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`; review every proposed record and source before committing it.

## Corrections and contributions

Corrections, additional primary sources, and focused improvements are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or pull request.

## Independence

Stripe History is not affiliated with, endorsed by, or operated by Stripe, Inc. Stripe names and trademarks belong to their respective owners.

## License

Code and authored history data in this repository are available under the [MIT License](./LICENSE).

[![Hraness](./assets/hraness-wordmark-dark.svg#gh-light-mode-only)](https://hraness.com/)
[![Hraness](./assets/hraness-wordmark-light.svg#gh-dark-mode-only)](https://hraness.com/)
