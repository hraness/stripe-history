import { describe, expect, test } from "bun:test";
import { INDEXABLE_ROBOTS } from "@hraness/web-discovery";
import { renderToStaticMarkup } from "react-dom/server";

import { loadHistory } from "@/lib/content";

import HistoryEventPage, {
  generateMetadata,
  generateStaticParams,
} from "./page";

describe("stripedex.com event history pages", () => {
  test("generates a durable path for every sourced event", async () => {
    const history = await loadHistory();
    const params = await generateStaticParams();
    expect(params).toContainEqual({
      category: "acquisitions",
      eventId: "openrouter-acquisition-talks-reported",
    });
    expect(params).toHaveLength(history.events.length);
  });

  test("publishes crawlable, sourced event HTML without a loading shell", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({
        category: "acquisitions",
        eventId: "openrouter-acquisition-talks-reported",
      }),
    });
    const html = renderToStaticMarkup(await HistoryEventPage({
      params: Promise.resolve({
        category: "acquisitions",
        eventId: "openrouter-acquisition-talks-reported",
      }),
    }));

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "/history/acquisitions/openrouter-acquisition-talks-reported",
      },
      robots: INDEXABLE_ROBOTS,
      title: "Stripe reportedly discusses acquiring OpenRouter",
    });
    expect(html).toContain("<h1>Stripe reportedly discusses acquiring OpenRouter</h1>");
    expect(html).toContain("<time dateTime=\"2026-07-24\">2026-07-24</time>");
    expect(html).toContain("AI-model marketplace OpenRouter");
    expect(html).toContain("not affiliated with, endorsed by, or operated by");
    expect(html).toContain('href="/history/acquisitions"');
    expect(html).toContain('id="stripedex-history-event-structured-data"');
    expect(html).toContain('data-theme-value="system"');
    expect(html).toContain('class="hraness-brand stripedex-footer-hraness"');
    expect(html).not.toContain("Loading Stripe company history");
    expect(html.match(/data-presentation="menu"/gu)).toHaveLength(1);
  });
});
