# Weekly publication

The [weekly history publication workflow](../.github/workflows/weekly-news.yml) runs every Thursday at 9:17 AM Atlantic time. It checks Stripe's first-party newsroom index, first-party blog and publication RSS feeds, focused publisher feeds, bounded GDELT searches, and a domain-restricted Exa search for long-form leadership appearances, then removes URLs already present in the source catalog. Appearance identities are derived from the reviewed people in the executive history rather than maintained as a second hard-coded roster. Appearance candidates remain review-only.

Up to three current company-history candidates receive bounded triage from [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) at `max` reasoning effort. Candidates from reviewed first-party or publisher-feed monitors can continue to an independent structured review. The model never receives Git credentials, shell access, or file tools. A deterministic compiler can only add one new event or append one source reference inside the categories allowed by [`publication-policy.yml`](../public/research/publication-policy.yml). It requires exact source-text quotes, preserves reporting uncertainty, records hash-only evidence and model attestations, and caps each run at two published changes. Reports from other monitors can identify corroboration, but cannot change the published corpus automatically.

Every outcome, including rejections and corroborating duplicates, is appended to [`automated-decisions.yml`](../public/research/automated-decisions.yml). Accepted changes retain the stronger evidence attestation in [`automated-publications.yml`](../public/research/automated-publications.yml). A terminal ledger decision prevents the same URL from consuming model capacity again. One rolling GitHub issue contains unresolved decisions such as ambiguous evidence, out-of-policy claims, capacity deferrals, or infrastructure errors. A delivery failure keeps that issue open until a later delivery completes its checks.

Accepted changes and decision-ledger updates must pass strict YAML schemas, the research audit, the full repository check, a production build, and a generated-file allowlist. The workflow permits at most five changed data files and no deletions. Before discovery, it checks the current main commit, required-check policy, workflow availability, write capability, and unresolved publication pull requests. The publication helper repeats those checks before writing.

The helper uses the built-in `GITHUB_TOKEN` through `gh`. It creates a commit with the validated Git tree and checked main parent, then atomically creates `automation/weekly-history/<run-id>`. A pre-existing run branch or unresolved same-repository pull request with this publisher’s numeric run branch stops the run. A fork using the same branch prefix does not block publication. It opens a pull request and explicitly dispatches `ci.yml` on that branch because pull requests created by the workflow token do not start another workflow automatically. It requires successful blocking jobs, including `Required`, from GitHub Actions App 15368 on the exact candidate commit and workflow run. The protected squash merge uses `--match-head-commit` to guard the PR head. Strict required checks separately require the branch to be up to date, so the server rejects the merge if main advances after the helper’s final base check. The helper also verifies the merged parent and tree.

After merging, the helper checks the integrated commit's parent and tree, dispatches fresh CI on current `main`, and verifies the exact integrated SHA. GitHub's dispatch API accepts a current branch or tag, so the helper checks the branch before and after dispatch and rejects a mismatched run. It cannot dispatch an arbitrary historical main commit after another change advances the branch. Delivery also requires Vercel's normal successful Production deployment for that SHA and the existing Production browser workflow triggered by its deployment status. The helper never triggers a deployment or substitutes a manual browser run for that evidence.

Repository-wide workflow permissions remain read-only. Only the publication job requests Actions, contents, issues, and pull-request writes, plus check and deployment reads. An administrator must enable GitHub Actions' **Allow GitHub Actions to create and approve pull requests** setting for the organization and repository, retaining `default_workflow_permissions=read`. This is a built-in GitHub setting, not a new App or secret. Its administrative API is outside the job token's permissions: record the effective organization and repository readback with authenticated `gh` before enabling unattended delivery. No approval review is submitted by this workflow. Main must require a pull request and `Required`, with `strict_required_status_checks_policy=true` for each effective rule requiring that context. Pin the context to GitHub Actions App 15368, preserve other protections, and record the effective policy readback before activation. The helper rejects missing or loose strict-check policy before discovery or remote writes; the head-match flag alone does not guard the base commit. It independently verifies the check provider even if an older rule omits the pin.

The `weekly-news` artifact includes `delivery.json` with commit identities, pull request and workflow IDs, deployment evidence, and each attempted write. Writes are never automatically retried because a transport failure can follow a successful remote write. Workflow reruns stop before discovery; inspect the original run's branch, pull request, checks, and artifact before a reviewed recovery. Preserve those objects when the outcome is uncertain. If main advances, recover through a new reviewed pull request against current main and repeat the affected checks. The workflow never force-pushes, bypasses a rule, or deletes a recovery branch. Its delivery wait is capped at 25 minutes and stops at least two minutes before the existing 45-minute job limit to leave time for reports and the durable failure issue.

Automatic publication requires a Vercel AI Gateway key. The workflow exposes the sealed GitHub Actions secret as `STRIPE_HISTORY_LLM_API_KEY`. Create replacement keys in the [AI Gateway API Keys page](https://vercel.com/docs/ai-gateway/authentication-and-byok), then store them without placing credentials in source or logs. The optional `EXA_API_KEY` GitHub Actions secret enables the checked, domain-restricted Exa discovery monitor; direct publisher evidence still comes from each result's canonical source. The checked policy bounds model calls and output size; review provider usage and spending separately.

Run the same discovery locally with an explicit date:

```sh
bun run history:news:pull -- --as-of 2026-08-20 --json-out /tmp/stripe-news.json --markdown-out /tmp/stripe-news.md
```

The manual [leadership appearance backfill](../.github/workflows/appearance-backfill.yml) searches one bounded calendar window at a time from 2009 onward and uploads a private review artifact. It does not edit public data or open issues. Reviewers deduplicate the artifact, capture the retained sources, and merge only evidence-backed records into the main [leadership appearances](https://hraness.com/stripe/history/appearances) timeline category. The same window can be inspected locally:

```sh
bun run history:news:pull -- --from 2020-01-01 --as-of 2020-12-31 --monitor exa-stripe-leadership-appearances --json-out /tmp/stripe-appearances-2020.json --markdown-out /tmp/stripe-appearances-2020.md
```

After capturing and reviewing a candidate's complete transcript, generate a grounded digest proposal with the strong-model summarizer:

```sh
STRIPE_HISTORY_LLM_API_KEY=... bun run history:appearances:summarize -- --capture /absolute/path/to/capture.md --json-out /tmp/appearance-summary.json
```

The summarizer uses `openai/gpt-5.6-sol` at `max` reasoning by default, emits a short summary (gist) and three to five ideas, and fails unless every private audit quote is an exact 6–25-word transcript passage. It never edits the appearance corpus. A reviewer reconciles the proposed digest, participant role, date, canonical source, and transcript status before adding YAML and a research-run decision.

Preview model decisions without editing the corpus by omitting `--write`:

```sh
STRIPE_HISTORY_LLM_API_KEY=... bun run history:publish:auto -- --digest /tmp/stripe-news.json --json-out /tmp/stripe-publication.json --markdown-out /tmp/stripe-publication.md
```

The scheduled workflow is the publication owner. Local `--write` is intended only for deterministic fixture work or a reviewed recovery, not a second concurrent publisher.
