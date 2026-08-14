# Stripe History

[stripehistory.com](https://stripehistory.com/) is an independent, open-source timeline of Stripe company history, with sourced data on products, acquisitions, funding, leadership, expansion, milestones, and annual payment volume.

The site renders more than 200 sourced events as one reverse-chronological history and as focused, crawlable category pages. Each event records its date, confidence, summary, category, and source provenance in reviewable YAML, plus status when it applies.

## Browse the history

- [Complete Stripe company history](https://stripehistory.com/)
- [Acquisitions](https://stripehistory.com/history/acquisitions)
- [Product launches](https://stripehistory.com/history/product-launches)
- [Fundraising](https://stripehistory.com/history/fundraising)
- [Company milestones](https://stripehistory.com/history/company-milestones)
- [Annual payment and total volume](https://stripehistory.com/history/payment-volume)

The authored records live in [`public/history/`](./public/history/), one file per category. They remain ordinary YAML so corrections are readable in review and the underlying evidence is available without scraping the site.

## Sources and editorial method

Entries prefer primary sources and strong contemporaneous reporting. Review checks chronology, source support, category placement, and duplicate claims. The records preserve distinctions between announced, offered, reported, and completed events instead of converting uncertainty into fact.

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

The optional `bun run history:sessions:update` command re-extracts notable product launches from the checked Stripe Sessions source set. It requires `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`; review every proposed record and source before committing it.

## Corrections and contributions

Corrections, additional primary sources, and focused improvements are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or pull request.

## Independence

Stripe History is not affiliated with, endorsed by, or operated by Stripe, Inc. Stripe names and trademarks belong to their respective owners.

## License

Code and authored history data in this repository are available under the [MIT License](./LICENSE).

[![Hraness](./assets/hraness-wordmark-dark.svg#gh-light-mode-only)](https://hraness.com/)
[![Hraness](./assets/hraness-wordmark-light.svg#gh-dark-mode-only)](https://hraness.com/)
