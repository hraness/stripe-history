import { describe, expect, test } from "bun:test";
import { loadHistory } from "@/lib/content";
import { eventMetaDescription } from "@/lib/event-page";
import { renderToStaticMarkup } from "react-dom/server";

import HistoryEventPage, { generateMetadata, generateStaticParams } from "./page";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("per-event pages", () => {
  test("prerenders exactly one page per event and nothing else", async () => {
    const history = await loadHistory();
    const generated = await generateStaticParams();
    expect(generated).toEqual(history.events.map(({ id }) => ({ id })));
  });

  test("answer-first page with facts, sources, neighbors, and structured data", async () => {
    const history = await loadHistory();
    const event = history.events.find(({ categoryId, sources }) => categoryId === "acquisitions" && sources.length > 1);
    expect(event).toBeDefined();
    if (event === undefined) return;
    const html = renderToStaticMarkup(await HistoryEventPage(params(event.id)));
    const escape = (text: string) => renderToStaticMarkup(<>{text}</>);

    expect(html).toContain(`<h1 id="event-heading">${escape(event.title)}</h1>`);
    expect(html).toContain(escape(event.summary));
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/history/acquisitions"');
    for (const source of event.sources) expect(html).toContain(`href="${escape(source.url)}"`);
    expect(html).toMatch(/href="\/events\/[a-z0-9-]+"/u);
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain(`"url":"https://hraness.com/stripe/events/${event.id}"`);
    expect(html).toContain('"startDate":"');
    expect(html).toContain('"citation":[');
  });

  test("unique canonical metadata", async () => {
    const history = await loadHistory();
    const event = history.events[0];
    if (event === undefined) throw new Error("empty corpus");
    const metadata = await generateMetadata(params(event.id));
    expect(metadata.alternates?.canonical).toBe(`https://hraness.com/stripe/events/${event.id}`);
    expect(metadata.description).toBe(eventMetaDescription(event));
    expect(metadata.openGraph).toMatchObject({ type: "article", url: `https://hraness.com/stripe/events/${event.id}` });
    expect(await generateMetadata(params("no-such-event"))).toEqual({});
  });
});
