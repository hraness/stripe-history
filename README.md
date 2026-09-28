# Stripe History

[Stripe History](https://hraness.com/stripe) is an independent record of how Stripe grew, from the Collison brothers' first projects to today. Every event is dated and linked to its sources, and reported deals stay separate from completed ones. It is not affiliated with Stripe, Inc.

The site shows every event on one reverse-chronological timeline and on a page for each category, such as acquisitions, product launches, and fundraising. Separate pages chart Stripe's annual payment and total volume, its revenue, and its private valuation by year. Each event's YAML record keeps its status and any uncertainty, such as whether a deal was reported, announced, or completed.

The homepage's “How this record is kept” panel shows how many events, sources, and source links the timeline has, and the date of the newest entry. It links to the [method and limits](https://hraness.com/stripe/about#sources-and-review), the [YAML downloads](https://hraness.com/stripe/data), and [how to report a correction](https://hraness.com/stripe/contact#corrections-and-sources).

## Browse the history

- [Stripe History timeline](https://hraness.com/stripe)
- [Acquisitions](https://hraness.com/stripe/history/acquisitions)
- [Product launches](https://hraness.com/stripe/history/product-launches)
- [Fundraising](https://hraness.com/stripe/history/fundraising)
- [Company milestones](https://hraness.com/stripe/history/company-milestones)
- [Annual payment and total volume](https://hraness.com/stripe/history/payment-volume)
- [Annual net revenue and revenue](https://hraness.com/stripe/history/net-revenue)
- [Private-company valuation history](https://hraness.com/stripe/history/valuation)
- [Stripe leadership appearances](https://hraness.com/stripe/history/appearances)
- [Open history and research data](https://hraness.com/stripe/data)

## Use the data

Each category is one YAML file. For example:

```sh
curl -O https://hraness.com/stripe/history/acquisitions.yml
```

All files are listed at https://hraness.com/stripe/data and in [`public/history/`](./public/history/). The data is MIT licensed.

## Other Stripe references

Checked September 28, 2026. [Wikipedia](https://en.wikipedia.org/wiki/Stripe,_Inc.) is better for a short overview and is cited far more widely. [Stripe's newsroom](https://stripe.com/newsroom) and annual letters are the primary source for many entries here; this site adds reported events Stripe did not announce and puts everything in one timeline. [Crunchbase](https://www.crunchbase.com/organization/stripe), [PitchBook](https://pitchbook.com) and [Tracxn](https://tracxn.com/d/acquisitions/acquisitions-by-stripe/__uahG_IGnVgsUsOG-f8otYHLkOkliWg7YFhJ5ZkNIkpI) are better for investor lists and comparing companies, and much of their data is paywalled. [Contrary Research](https://research.contrary.com/company/stripe) and [Sacra](https://sacra.com/c/stripe/) analyze the business, and Sacra publishes revenue estimates. Stripe History records disclosed and reported figures and makes no revenue estimates. A valuation it derives from reported share prices shows its formula.

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

Weekly automated publication, its limits and its local commands are documented in [docs/weekly-publication.md](./docs/weekly-publication.md).

Read the full [methodology and independence statement](https://hraness.com/stripe/about).

## Run locally

Use [Bun 1.3.14](https://bun.sh/) with genuine Node 24 on `PATH`. The compiled
adapter is pinned to Next 16.2.12 and webpack 5:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run dev
```

Copy `.env.example` to the ignored `.env.local` file only when configuring the
optional Production analytics values.

Every rendered page carries one shared Hraness footer with the general Hraness
newsletter, optional paid support, and social links. Before submission, anonymous
form presentation and measurement requests send Accounts the list choice, language,
compact or wide viewport category, and presentation version, then an opaque token
when the form becomes visible. They omit account credentials and email addresses.
Submitting the newsletter form sends the email address, `hraness` list choice,
form source, and any presentation token to Accounts,
which records dated consent. Resend delivers confirmation and subscribed messages
from `news.hraness.com`; subscription starts only after inbox confirmation.
Paid support opens Accounts separately for a human to review and confirm.
No separate Stripe History newsletter is created. Accounts retains earlier
`stripe-history` subscription records and
continues to honor their audience-specific unsubscribe state. Confirmed earlier
memberships may remain active, with Resend delivering any later Stripe History
messages from `news.hraness.com` until the recipient unsubscribes.

Open `http://127.0.0.1:3000/stripe` after the runner prints
`stripe-preview-ready`. Edit a recipe, enter `rebuild` in the terminal, wait for
the next ready event, then refresh the browser manually. Enter `quit` to stop
the owned servers. Pass another loopback port with `bun run dev 3100`.

Every rebuild copies the current product source and installed dependencies into
a fresh application root under ignored `.stylex-preview/`. The production
adapter completes discovery and delivery builds before a new server can replace
the previous generation. An unsuccessful generation keeps the previous server
and output selected. A successful generation starts its own `next start`, proves
its identity, switches the loopback proxy, and collects the old server. This
workflow does not provide HMR or preserve application state across refreshes.
Outputs and failed-build evidence remain available for inspection after shutdown.
Do not remove a session while its process owns it. Restart the preview session
after changing dependencies or runner configuration.

The header uses the released compiled design-kit component with native anchors
and explicit `/stripe` URLs. These header links perform document navigation;
they no longer use Next's client navigation or prefetch. Timeline actions retain
`next/link`, including the rich correction link and semantic review date.

Run the complete local verification before submitting a change:

```sh
bun run check
bun run build
```

`bun run build` is the checked production adapter, not a direct `next build`.
The native `next.config.mjs` entry loads the typed product policy through Node
24 ESM so the adapter's import-only package export is not rewritten to CommonJS.
`stylex-sources.json` declares the complete expected source census for each
compiler target. The adapter rejects missing, unexpected, or changed graph
inputs. Adding a route or client module requires reviewing that census as well
as passing the native build; an empty Edge list does not skip its receipt.

The exact Next 16.2.12 dependency has a declared Bun patch at
`patches/next@16.2.12.patch`. Its two app-page templates append the native RSC
`Vary` fields instead of overwriting the product's existing `Vary: Accept`.
The patch targets production HTML negotiation, not just the development proxy. Bun
applies the patch during frozen, lifecycle-disabled installation; keep its
manifest and lock entry together. Preview snapshots retain the patch itself.
The product namespaces Next's existing filesystem-cache version by the patch
and both installed template hashes, without replacing its cache options or
dependencies. This prevents a prior expanded entry from surviving a patch.
Both production and preview builds additionally check the actual delivery map's
expanded root-page handler before reporting a successful product generation.
The native loader reads the patched ESM template text and generates fresh
webpack sources and maps, which must pass the complete adapter checks. The
package's unused distributed template maps remain unchanged: they describe the
upstream templates, not the patched text. No framework writer hash, version
requirement, or generated source-map assertion is waived. Reassess and remove
this exact-version patch only after a replacement framework passes the real
HTML, Markdown, and unsupported-Accept response checks.

The native preview canary runs the complete product in an isolated source copy:

```sh
CHROMIUM_EXECUTABLE_PATH=/path/to/reviewed/browser bun run test:compiled-preview
```

It proves a real resources-recipe edit through a fresh complete generation,
owned server replacement, and explicit browser reload. It also injects an
invalid recipe, checks that the last successful server and CSS remain intact,
and verifies bounded server/browser cleanup. It does not edit the working
checkout or submit a newsletter or payment form. On managed Hraness hosts, run installs,
full builds, and this complete browser command through the host scheduler and
the repository resource scheduler; the preview/browser flow has one owner.

The footer resources, orientation, timeline/filter/year, and event/fact/source
slots use product-owned StyleX, and shared packages participate in one compiled
union. The event recipes are shared by the timeline and all three metric-page
disclosure renderers; their data, native links and chart frames keep their
existing owners. The native canary checks these roles in the real corpus across
light/dark, narrow, coarse-pointer and forced-color conditions before and after
the resources-recipe rebuild. Compiler-rule tests also require attached border
and minimum-height declarations, because unsupported shorthands can disappear
from the pinned compiler output.
Timeline and metric pages use the product-owned `stripe-history-page` grammar.
They do not also opt into the design kit's unlayered `plain-page` rules, which
would override compiled year typography and spacing. The shared foundation and
body palette remain unchanged; ordinary pages retain their existing grammar.
Metric charts, rails, valuation badges, and the remaining global/shell
presentation in `app/globals.css` and `support/` are still explicit migration
tasks. Passing this canary alone does not mean the whole
product or portfolio is migrated or deployment-verified.

After a production update is live, notify IndexNow of the canonical HTML URLs in the sitemap:

```sh
bun run search:indexnow -- --submit
```

Run the same command without `--submit` to inspect the exact payload. The command rejects duplicate, non-HTTPS, off-domain, and noncanonical URLs before making a request.

The optional `bun run history:sessions:update` command re-extracts notable product launches from the checked Stripe Sessions source set. It requires `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`; review every proposed record and source before committing it.

## Corrections and contributions

Corrections, additional primary sources, and focused improvements are welcome. The public [correction instructions](https://hraness.com/stripe/contact#corrections-and-sources) describe the evidence to include. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or pull request.

## Independence

Stripe History is not affiliated with, endorsed by, or operated by Stripe, Inc. Stripe names and trademarks belong to their respective owners.

Every event in this timeline links to its sources and the data behind the site is open YAML you can download, which is the design every Hraness project shares: work leaves a record anyone can check. [The thread through hraness](https://hraness.com/writing/the-thread-through-hraness) follows that design across the projects, and the [ALGAL vision](https://algal.computer/docs/vision/) states the bet behind it.

## License

Code and authored history data in this repository are available under the [MIT License](./LICENSE).

[![Hraness](./assets/hraness-wordmark-dark.svg#gh-light-mode-only)](https://hraness.com/)
[![Hraness](./assets/hraness-wordmark-light.svg#gh-dark-mode-only)](https://hraness.com/)
