import assert from "node:assert/strict";
import { defineConfig } from "@hraness/ra";
import type { Page } from "playwright-core";
import { verifyPublicationLinks } from "./scripts/verify-publication-links.mjs";

// ra's states for the public site, as https://hraness.com/stripe serves it. Run `bun run build`
// first: ra starts `next start`, which sends the site's own security headers. See AGENTS.md.

type Mode = "light" | "dark";

/** Paper's tuned canvas, which must outrank the palette system's defaults. */
const paper: Record<Mode, readonly [string, string]> = {
  light: ["#f4f1ea", "rgb(244, 241, 234)"],
  dark: ["#141311", "rgb(20, 19, 17)"],
};
const gruvbox: Record<Mode, string> = { light: "rgb(251, 241, 199)", dark: "rgb(40, 40, 40)" };

const systemMode = (page: Page): Promise<Mode> =>
  page.evaluate(() => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

async function within(what: string, wait: Promise<unknown>): Promise<void> {
  try {
    await wait;
  } catch {
    throw new Error(what);
  }
}

/** Every visible category glyph draws something; a missing symbol renders an empty box. */
const glyphs = (page: Page): Promise<void> =>
  within(
    "A visible category glyph is blank",
    page.waitForFunction(
      () =>
        [...document.querySelectorAll<SVGUseElement>(".history-category-icon use")]
          // Check the containing link or button, so an accidentally hidden SVG still fails.
          .filter((glyph) => (glyph.ownerSVGElement?.parentElement?.getClientRects().length ?? 0) > 0)
          .every((glyph) => {
            const box = glyph.getBBox();
            return box.width > 0 && box.height > 0;
          }),
      null,
      { timeout: 10_000 },
    ),
  );

/** What every ordinary page keeps, beyond what ra checks itself. */
async function sitewide(page: Page): Promise<void> {
  await glyphs(page);
  const mode = await systemMode(page);
  const seen = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const footer = document.querySelector("#stripe-history-footer");
    const header = [...document.querySelectorAll(".stripe-history-header a, .stripe-history-header button, .stripe-history-header summary")];
    return {
      heading: document.querySelector("h1")?.textContent?.trim() ?? "",
      theme: document.documentElement.dataset.theme,
      palette: [root.getPropertyValue("--hraness-palette-background").trim().toLowerCase(), root.backgroundColor],
      footer: [footer, footer?.querySelector(".stripe-history-footer__links")].map((element) =>
        element ? getComputedStyle(element).position : null,
      ),
      askAi: [
        document.querySelector(".stripe-history-ask-ai")?.getAttribute("aria-label"),
        document.querySelector(".stripe-history-ask-ai [data-slot='ask-ai-about-this-label']")?.textContent?.trim(),
      ],
      wideTables: [...document.querySelectorAll("table")]
        .filter((table) => table.getBoundingClientRect().width > (table.parentElement?.clientWidth ?? innerWidth) + 1)
        .map((table) => table.querySelector("caption, th")?.textContent?.trim()),
      // Phone header controls keep a 44px target, above ra's own 24px floor.
      smallHeaderTargets:
        innerWidth > 600
          ? []
          : header
              .map((element) => ({ label: element.textContent?.trim() || element.getAttribute("aria-label"), box: element.getBoundingClientRect() }))
              .filter(({ box }) => box.width > 0 && box.height > 0 && (box.width < 43.5 || box.height < 43.5))
              .map(({ label, box }) => `${label} ${Math.round(box.width)}x${Math.round(box.height)}`),
    };
  });
  assert.ok(seen.heading, "The page has no h1");
  assert.equal(seen.theme, mode, "data-theme doesn't follow the system appearance");
  assert.deepEqual(seen.palette, [...paper[mode]], "Paper's palette background and page canvas");
  assert.ok(seen.footer.every((position) => position === "static" || position === "relative"), "The footer left the normal flow");
  assert.deepEqual(seen.askAi, ["Ask AI", "Ask AI"], "The Ask AI row's label");
  assert.deepEqual(seen.wideTables, [], "Tables wider than their column");
  assert.deepEqual(seen.smallHeaderTargets, [], "Phone header targets below 44px");
}

const page = (url: string, note: string, more?: (page: Page) => Promise<void>) => ({
  url,
  note,
  expect: async (p: Page) => {
    await sitewide(p);
    await more?.(p);
  },
});

const openAppearance = async (p: Page): Promise<void> => {
  await within(
    "The appearance menu never became ready",
    p.waitForFunction(() => document.querySelector<HTMLElement>(".hraness-design-palette-menu")?.dataset.ready === "true"),
  );
  await p.locator(".hraness-design-palette-menu > summary").click();
};
const paint = (p: Page): Promise<string[]> =>
  p.evaluate(() => [document.documentElement, document.body].map((element) => getComputedStyle(element).backgroundColor));
const opposite = async (p: Page): Promise<Mode> => ((await systemMode(p)) === "light" ? "dark" : "light");

export default defineConfig({
  app: { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port {port}", ready: "/stripe" },
  views: ["desktop", "desktop.dark", "phone", "phone.dark", "narrow"],
  world: {
    replies: {
      // The shared footer asks whether this visitor's region needs opt-in consent. Answer as an
      // opt-in region, so nothing may measure, and keep looks off the account service.
      "GET https://account.hraness.com/api/consent/region": { json: { required: true } },
    },
    // Analytics, which hraness.com serves on this origin, and the shared footer's telemetry and mailing calls.
    block: [
      "/ph/**",
      "/ingest/**",
      "/_vercel/insights/**",
      "/api/region",
      "/api/event",
      "https://account.hraness.com/api/telemetry/**",
      "https://account.hraness.com/api/mailing/**",
    ],
  },
  states: {
    timeline: page("/stripe", "The timeline, newest first, with the scale chart.", async (p) => {
      const html = await p.request.get(p.url(), { headers: { accept: "text/html" } });
      const bytes = (await html.body()).byteLength;
      assert.ok(bytes < 2_000_000, `${bytes} HTML bytes exceed the crawl budget`);
    }),
    data: page("/stripe/data", "The data downloads and their schemas."),
    about: page("/stripe/about", "The methodology article.", async (p) => {
      await verifyPublicationLinks(p, [
        { name: "article", selector: ".stripe-history-about p a[href]:not([href$='/research/sources.yml'])" },
        { name: "sources", selector: ".stripe-history-about a[href$='/research/sources.yml']" },
      ]);
    }),
    valuation: page("/stripe/history/valuation", "Valuations, with their own chart and table."),
    "payment-volume": page("/stripe/history/payment-volume", "Annual payment volume."),
    "net-revenue": page("/stripe/history/net-revenue", "Net revenue, on payment volume's template."),
    appearances: page("/stripe/history/appearances", "A category: founder appearances."),
    acquisitions: page("/stripe/history/acquisitions", "A category: acquisitions."),
    event: page("/stripe/events/origins-stripe-public-launch", "One event and its sources."),
    contact: page("/stripe/contact", "How to send a correction."),
    privacy: page("/stripe/privacy", "The privacy notice and Your Privacy Choices."),
    "not-found": { url: "/stripe/no-such-page", note: "A path the site doesn't have.", status: 404 },
    "year-jump": {
      url: "/stripe",
      note: "A year link followed: the year lands below the sticky header and filters.",
      // These three states only click links and controls and change this browser's own storage,
      // so the production check runs them too.
      live: true,
      // 848 and 880 sit either side of the header and filter breakpoint.
      views: ["desktop", "880x900", "848x900", "phone", "narrow"],
      steps: async (p) => {
        await p.locator(".history-year-link").first().click();
      },
      expect: (p) =>
        within(
          "The year landed under the sticky header or filters",
          p.waitForFunction(
            () => {
              const target = location.hash ? document.querySelector(location.hash) : null;
              if (!target) return false;
              const obstruction = [...document.querySelectorAll(".stripe-history-header, .history-filters")]
                .filter((element) => getComputedStyle(element).position === "sticky")
                .reduce((bottom, element) => Math.max(bottom, element.getBoundingClientRect().bottom), 0);
              return target.getBoundingClientRect().top >= obstruction - 1;
            },
            null,
            { timeout: 5_000 },
          ),
        ),
    },
    measures: {
      url: "/stripe",
      note: "The phone scale chart, stepped through each measure; it has no desktop layout.",
      live: true,
      views: ["phone", "narrow"],
      steps: async (p) => {
        const controls = p.getByRole("group", { name: "Scale chart", exact: true });
        for (const [id, label] of [
          ["payment-volume", "annual volume"],
          ["net-revenue", "net revenue"],
          ["valuation", "valuation"],
        ] as const) {
          await controls.getByRole("button", { name: label, exact: true }).click();
          await within(
            `The ${label} card didn't snap to the rail`,
            p.waitForFunction(
              (measure) => {
                const rail = document.querySelector(".history-measure-rail");
                const card = document.querySelector(`#history-measure-${measure}`);
                const control = document.querySelector(`.history-measure-controls button[aria-controls="history-measure-${measure}"]`);
                if (!rail || !card || control?.getAttribute("aria-pressed") !== "true") return false;
                const padding = parseFloat(getComputedStyle(rail).scrollPaddingInlineStart) || 0;
                return Math.abs(card.getBoundingClientRect().left - rail.getBoundingClientRect().left) <= padding + 1;
              },
              id,
              { timeout: 5_000 },
            ),
          );
          await glyphs(p);
        }
      },
    },
    appearance: {
      url: "/stripe",
      note: "The other mode chosen, kept over a reload, then Gruvbox, then the Data link.",
      live: true,
      steps: async (p) => {
        const mode = await opposite(p);
        await openAppearance(p);
        await p.getByRole("radio", { name: new RegExp(`^${mode}$`, "iu") }).check();
        await p.waitForFunction((m) => document.documentElement.dataset.theme === m, mode);
        await p.reload();
        await p.waitForFunction((m) => document.documentElement.dataset.theme === m, mode);
        // hraness.com shares this origin and reads the same two keys: the choice, and the mode alone.
        const stored = await p.evaluate(() => {
          let saved: unknown = null;
          try {
            saved = JSON.parse(localStorage.getItem("hraness-design-palette-v1") ?? "null");
          } catch {
            // Reported below.
          }
          return [saved, localStorage.getItem("hraness-theme")];
        });
        assert.deepEqual(stored, [{ palette: "paper", mode }, mode], "Appearance storage shared with hraness.com");
        // The other palettes paint the whole page, not only the menu and the browser's theme colour.
        await openAppearance(p);
        await p.getByRole("radio", { name: "Gruvbox", exact: true }).check();
        await p.waitForFunction(() => document.documentElement.dataset.palette === "gruvbox");
        await p.keyboard.press("Escape");
        await p.waitForFunction(() => document.querySelector<HTMLDetailsElement>(".hraness-design-palette-menu")?.open === false);
        assert.deepEqual(await paint(p), [gruvbox[mode], gruvbox[mode]], "Gruvbox canvas and page");
        await p.locator("header").getByRole("link", { name: "Data", exact: true }).click();
        await p.waitForURL((url) => url.pathname === "/stripe/data");
      },
      expect: async (p) => {
        const mode = await opposite(p);
        assert.deepEqual(await paint(p), [gruvbox[mode], gruvbox[mode]], "Gruvbox after navigating to Data");
      },
    },
  },
});
