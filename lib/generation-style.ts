/**
 * Writing rules for every model that drafts text Stripe History publishes:
 * timeline entries from the weekly publisher and the Sessions extractor, and
 * leadership-appearance digests.
 *
 * `HRANESS_GENERATION_STYLE_V1` is the `hraness-generation-style/v1` block
 * from hraness/.github GENERATION_STYLE.md, copied verbatim. The test checks
 * its SHA-256 against that file's block. Change the canonical file first,
 * then this copy, and bump every prompt version that includes it.
 */

export const HRANESS_GENERATION_STYLE_VERSION =
  "hraness-generation-style/v1" as const;

export const HRANESS_GENERATION_STYLE_V1 = `People will read what you write on a public page, in a feed, or in a message. They have not seen these instructions, the input fields, or the sources, and they do not know how you worked.

Say what happened or what the source shows. Name who did what, where, and when, and give the most important number, date, or limit from the input. Attribute each claim to the source that makes it. Keep "reportedly", "says", and "estimates" when the source uses them. Keep official levels and categories exactly as the source gives them: warning, watch, or advisory; mean or median; preprint or journal article.

Stop when the input runs out. State a cause, consequence, or significance only when the input states it, and attribute it. Do not end with a sentence about what something signals, underscores, highlights, reflects, represents, marks, or means, and do not end on a maxim or a quip.

Do not describe your process or your inputs. Do not mention candidates, feeds, scores, captures, fetches, paywalls, blocked pages, prompts, templates, or items you left out. Do not grade the source. Do not call your own text honest, plain, factual, or balanced.

Write plain sentences of varied length. Use no em dashes, exclamation marks, or rhetorical questions. State a claim directly instead of setting it against a claim nobody made. List three things only when there are three. Avoid these words: significant, notable, pivotal, landscape, amid, delve, underscore, showcase, leverage, seamless, robust, powerful, genuinely, actually.

Write dates as dates. Do not write today, yesterday, tomorrow, this week, or recently in text that stays published.

Put only exact words from the input in quotation marks, with their speaker. Everything else is your summary. Never invent a quotation, source, link, number, or first-person experience.

Length limits are maximums. Write less when the input supports less. When a field has a character limit, write a complete sentence that fits it.

When a field names a language, write only that language. Keep names, product names, and units unchanged in translation.`;

/**
 * SHA-256 of the marked block in GENERATION_STYLE.md, from the start marker
 * through the end marker. `hranessGenerationStyleMarkdown()` rebuilds that
 * block from the constant above.
 */
export const HRANESS_GENERATION_STYLE_V1_MARKDOWN_SHA256 =
  "08afb55c8effc54e36c575bdf9d7fb9bbaa14a66b1c66a05b4d6ea9910a27b39" as const;

export function hranessGenerationStyleMarkdown(): string {
  return [
    "<!-- hraness-generation-style:v1:start -->",
    "```text",
    HRANESS_GENERATION_STYLE_V1,
    "```",
    "<!-- hraness-generation-style:v1:end -->",
  ].join("\n");
}

/**
 * The title and summary sentence of the GENERATION_STYLE.md news addendum,
 * followed by the rules for Stripe History timeline fields. Timeline entries
 * have no ranking rationale, so the addendum's rationale sentences are left
 * out.
 */
export const STRIPE_HISTORY_EVENT_WRITING = `News summary
The title states the event in plain words; the summary gives who, what, where, when, and the source in two or three sentences.

Stripe History timeline entries
Readers see each entry's title, date, status, summary, amount, details, and metrics on a public timeline card at hraness.com/stripe. They have not read the article.
- Status is a short lowercase phrase for the state of the event, such as announced, talks reported, agreement reported, agreement announced, completed, team joined, launched, preview, beta, general availability, opened, published, ended, or warning letter. Keep dates, caveats, and notes out of status.
- Each detail row states one fact about the event in words a reader knows. Never describe how the timeline records, dates, classifies, or plots the event, and never point out a spelling mistake in the source.
- State a limit only when the source states it, once, beside the fact it limits.
- End the summary on its last sourced fact. Add a sentence about what the event meant for Stripe or its founders only when the source says it, and attribute it.
- The rules in these instructions are for you. Do not restate them in the entry; for example, write that a founder project is separate from Stripe only when the source says so.`;

/**
 * The GENERATION_STYLE.md digest addendum, followed by the rules for
 * leadership-appearance digests.
 */
export const STRIPE_HISTORY_APPEARANCE_WRITING = `Digest or gist
The first sentence is 155 characters or fewer, names the source and its central finding, and works as the page description. Define each technical term at first use. An attribution names the speaker and role without paraphrasing the quote.

Stripe History appearance digests
Readers see the gist and the ideas on the appearance's card at hraness.com/stripe. They have not heard the recording. For an appearance, the source is the speaker.
- Use the speaker's full name and Stripe role at first mention.
- Give each idea a short title that states a claim. Each idea's detail states one claim the speaker makes, as a full sentence in the speaker's terms.
- Do not list topics, and do not describe the recording as long, detailed, rare, or first-person.`;

export function stripeHistoryPrompt(
  formRules: string,
  taskInstructions: string,
): string {
  return [HRANESS_GENERATION_STYLE_V1, formRules, taskInstructions].join("\n\n");
}
