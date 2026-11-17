import assert from "node:assert/strict";
import { verifyPublicationLinks } from "./verify-publication-links.mjs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { ownedBrowserOptions, pinnedBrowserExecutable } from "./pinned-browser.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const production = process.argv.includes("--production");
assert.ok(process.argv.slice(2).every(argument => argument === "--production"), "Unknown argument");
const routes = ["/stripe", "/stripe/data", "/stripe/about", "/stripe/history/valuation", "/stripe/history/payment-volume", "/stripe/history/net-revenue", "/stripe/history/appearances", "/stripe/contact", "/stripe/privacy", "/stripe/history/acquisitions", "/stripe/events/origins-stripe-public-launch"];
const artifacts = resolve(process.env.SITE_BROWSER_ARTIFACTS ?? "/tmp/stripe-history-site-browser");
await mkdir(artifacts, { recursive: true });
let origin = "https://hraness.com";
let server;
let exited;
let output = "";
let browser;
const results = [];
try {
  if (!production) {
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise((resolveClose, reject) => reservation.close(error => error ? reject(error) : resolveClose()));
    origin = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    exited = new Promise((resolveExit, reject) => { server.once("exit", resolveExit); server.once("error", reject); });
    // Keep diagnostics bounded while draining both pipes.
    for (const stream of [server.stdout, server.stderr]) stream.on("data", chunk => { output = (output + chunk).slice(-32_768); });
    const deadline = Date.now() + 45_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (server.exitCode !== null || server.signalCode !== null) throw new Error(`Next exited: ${output}`);
      try { if ((await fetch(origin + routes[0], { signal: AbortSignal.timeout(2_000) })).ok) { ready = true; break; } } catch { /* Wait for our server to bind. */ }
      await new Promise(resolveWait => setTimeout(resolveWait, 100));
    }
    assert.ok(ready, `Next did not become ready: ${output}`);
  }
  const executablePath = pinnedBrowserExecutable(chromium.executablePath());
  browser = await chromium.launch(ownedBrowserOptions(executablePath));
  console.log(`Browser: ${executablePath} (${browser.version()})`);
  // Each viewport/theme pair has its own context (and so its own stored theme).
  // A small pool keeps the runner's CPU below the page wait timeouts.
  const combos = [360, 390, 1440].flatMap(width => ["light", "dark"].map(theme => ({ width, theme })));
  const poolSize = Math.min(combos.length, Number(process.env.SITE_BROWSER_CONCURRENCY ?? 3));
  assert.ok(Number.isInteger(poolSize) && poolSize >= 1, "SITE_BROWSER_CONCURRENCY must be a positive integer");
  let next = 0;
  const failures = [];
  await Promise.all(Array.from({ length: poolSize }, async () => {
    while (next < combos.length) {
      const combo = combos[next++];
      try { await verifyCombination(combo); }
      catch (error) { failures.push({ ...combo, error }); }
    }
  }));
  if (failures.length > 0) {
    for (const { width, theme, error } of failures) console.error(`${width} ${theme}: ${error?.stack ?? error}`);
    throw failures.length === 1 ? failures[0].error : new AggregateError(failures.map(failure => failure.error), `${failures.length} viewport/theme combinations failed`);
  }
} finally {
  try { await browser?.close(); }
  finally {
    if (server) {
      if (server.exitCode === null && server.signalCode === null) server.kill("SIGTERM");
      const timer = setTimeout(() => { if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL"); }, 5_000);
      try { await exited; } finally { clearTimeout(timer); }
    }
  }
}

async function verifyCombination({ width, theme }) {
  const context = await browser.newContext({ viewport: { width, height: width === 360 ? 740 : width === 390 ? 844 : 900 }, colorScheme: theme, hasTouch: width < 600, isMobile: width < 600 });
  try {
    const page = await context.newPage();
    const errors = [];
    // Chromium's console message for a failed resource omits its URL; keep it.
    const failedResponses = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("response", response => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`); });
    for (const route of routes) {
      const response = await page.goto(origin + route);
      assert.equal(response?.status(), 200, route);
      if (route === "/stripe") {
        const htmlBytes = Buffer.byteLength(await response.text());
        assert.ok(htmlBytes < 2_000_000, `${route}: ${htmlBytes} HTML bytes exceed the crawl budget`);
      }
      await page.locator("main").waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Full-page captures include portraits below the lazy-loading threshold.
      // Load their real assets before capturing, rather than recording blanks.
      await page.locator("img").evaluateAll(images => images.forEach(image => { image.loading = "eager"; }));
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0), null, { timeout: 10_000 });
      await page.locator("img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await verifyVisibleCategoryGlyphs(page);
      const state = await page.evaluate(() => {
        const footer = document.querySelector("#stripe-history-footer");
        return {
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
          heading: document.querySelector("h1")?.textContent?.trim(),
          theme: document.documentElement.dataset.theme,
          paletteBackground: getComputedStyle(document.documentElement).getPropertyValue("--hraness-palette-background").trim().toLowerCase(),
          canvas: getComputedStyle(document.documentElement).backgroundColor,
          footerPositions: [footer, footer?.querySelector(".stripe-history-footer__links")].map(element => element ? getComputedStyle(element).position : null),
          askAi: [document.querySelector(".stripe-history-ask-ai")?.getAttribute("aria-label"), document.querySelector(".stripe-history-ask-ai [data-slot='ask-ai-about-this-label']")?.textContent?.trim()],
          wideTables: [...document.querySelectorAll("table")].filter(table => table.getBoundingClientRect().width > (table.parentElement?.clientWidth ?? innerWidth) + 1).map(table => table.querySelector("caption, th")?.textContent?.trim()),
          smallHeaderTargets: innerWidth > 600 ? [] : [...document.querySelectorAll(".stripe-history-header a, .stripe-history-header button, .stripe-history-header summary")].filter(element => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.width < 43.5 || box.height < 43.5); }).map(element => ({ label: element.textContent?.trim() || element.getAttribute("aria-label"), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
        };
      });
      const name = `${width}-${theme}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "_")}`;
      const screenshot = await page.screenshot({ path: resolve(artifacts, `${name}.png`), fullPage: false, animations: "disabled" });
      state.screenshotWidth = screenshot.readUInt32BE(16);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      await page.screenshot({ path: resolve(artifacts, `${name}-bottom.png`), animations: "disabled" });
      await writeFile(resolve(artifacts, `${name}.json`), JSON.stringify({ route, state, errors, failedResponses }, null, 2));
      assert.ok(!state.overflow, `${route}: horizontal overflow at ${width}`);
      assert.equal(state.screenshotWidth, width, `${route}: capture exceeds viewport`);
      assert.ok(state.heading, `${route}: missing heading`);
      assert.equal(state.theme, theme, `${route}: system appearance`);
      // Paper's tuned product values must outrank the palette system's defaults.
      assert.equal(state.paletteBackground, theme === "light" ? "#f4f1ea" : "#141311", `${route}: palette background`);
      assert.equal(state.canvas, theme === "light" ? "rgb(244, 241, 234)" : "rgb(20, 19, 17)", `${route}: page canvas`);
      assert.ok(state.footerPositions.every(position => position === "static" || position === "relative"), `${route}: footer not in normal flow`);
      assert.deepEqual(state.smallHeaderTargets, [], `${route}: phone targets below 44px`);
      assert.deepEqual(state.askAi, ["Ask AI", "Ask AI"], `${route}: Ask AI row label`);
      assert.deepEqual(state.wideTables, [], `${route}: tables wider than their column at ${width}`);
      assert.deepEqual(errors, [], `${route}: browser errors; responses >= 400: ${JSON.stringify(failedResponses)}`);
      const links = route === "/stripe/about" ? await verifyPublicationLinks(page, [
        { name: "article", selector: ".stripe-history-about p a[href]:not([href$='/research/sources.yml'])" },
        { name: "sources", selector: ".stripe-history-about a[href$='/research/sources.yml']" },
      ]) : undefined;
      results.push({ route, width, theme, links });
    }
    await page.goto(origin + routes[0]);
    // Check the header/filter breakpoint and real year-link anchor clearance.
    for (const anchorWidth of width === 1440 ? [848, 880, 1440] : [width]) {
      await page.setViewportSize({ width: anchorWidth, height: 900 });
      await page.goto(origin + "/stripe");
      await page.locator(".history-year-link").first().click();
      await page.waitForFunction(() => {
        const target = document.querySelector(location.hash);
        if (!target) return false;
        const obstruction = [...document.querySelectorAll(".stripe-history-header, .history-filters")]
          .filter(element => getComputedStyle(element).position === "sticky")
          .reduce((bottom, element) => Math.max(bottom, element.getBoundingClientRect().bottom), 0);
        return target.getBoundingClientRect().top >= obstruction - 1;
      }, null, { timeout: 5_000 });
      await page.screenshot({ path: resolve(artifacts, `${anchorWidth}-${theme}-anchor.png`), animations: "disabled" });
    }
    await page.setViewportSize({ width, height: width === 360 ? 740 : width === 390 ? 844 : 900 });
    await page.goto(origin + routes[0]);
    if (width < 600) {
      // These controls have no desktop layout; prove their glyphs when shown on phones.
      const controls = page.getByRole("group", { name: "Scale chart", exact: true });
      for (const [id, label] of [["payment-volume", "annual volume"], ["net-revenue", "net revenue"], ["valuation", "valuation"]]) {
        await controls.getByRole("button", { name: label, exact: true }).click();
        await page.waitForFunction(measureId => {
          const rail = document.querySelector(".history-measure-rail");
          const card = document.querySelector(`#history-measure-${measureId}`);
          const control = document.querySelector(`.history-measure-controls button[aria-controls="history-measure-${measureId}"]`);
          if (!rail || !card || control?.getAttribute("aria-pressed") !== "true") return false;
          const snapPadding = parseFloat(getComputedStyle(rail).scrollPaddingInlineStart) || 0;
          return Math.abs(card.getBoundingClientRect().left - rail.getBoundingClientRect().left) <= snapPadding + 1;
        }, id, { timeout: 5_000 });
        await verifyVisibleCategoryGlyphs(page);
      }
    }
    const themeMenu = page.locator(".hraness-design-palette-menu");
    const openThemeMenu = async () => {
      await page.waitForFunction(() => document.querySelector(".hraness-design-palette-menu")?.dataset.ready === "true");
      await themeMenu.locator(":scope > summary").click();
    };
    await openThemeMenu();
    const targetTheme = theme === "light" ? "dark" : "light";
    await page.getByRole("radio", { name: new RegExp(`^${targetTheme}$`, "iu") }).check();
    await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, targetTheme);
    await page.reload();
    await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, targetTheme);
    // hraness.com serves this site at /stripe and reads the same two keys: the
    // choice, and the light or dark mode on its own.
    assert.deepEqual(await page.evaluate(() => {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem("hraness-design-palette-v1") ?? "null"); } catch { /* Reported below. */ }
      return [saved, localStorage.getItem("hraness-theme")];
    }), [{ palette: "paper", mode: targetTheme }, targetTheme], "appearance storage shared with hraness.com");
    // The other palettes paint the whole page, not only the menu and the
    // browser's theme colour.
    await openThemeMenu();
    await page.getByRole("radio", { name: "Gruvbox", exact: true }).check();
    await page.waitForFunction(() => document.documentElement.dataset.palette === "gruvbox");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector(".hraness-design-palette-menu")?.open === false);
    const gruvbox = targetTheme === "light" ? "rgb(251, 241, 199)" : "rgb(40, 40, 40)";
    const paint = () => page.evaluate(() => [document.documentElement, document.body].map(element => getComputedStyle(element).backgroundColor));
    assert.deepEqual(await paint(), [gruvbox, gruvbox], "Gruvbox canvas and page");
    await page.locator("header").getByRole("link", { name: "Data", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/stripe/data");
    assert.deepEqual(await paint(), [gruvbox, gruvbox], "Gruvbox after navigation");
    assert.deepEqual(errors, [], `Browser errors after appearance and navigation; responses >= 400: ${JSON.stringify(failedResponses)}`);
  } finally { await context.close(); }
}
async function verifyVisibleCategoryGlyphs(page) {
  await page.waitForFunction(() => [...document.querySelectorAll(".history-category-icon use")]
    // Check the containing link/button so accidentally hidden SVGs still fail.
    .filter(glyph => glyph.ownerSVGElement?.parentElement?.getClientRects().length > 0)
    .every(glyph => {
      const box = glyph.getBBox();
      return box.width > 0 && box.height > 0;
    }), null, { timeout: 10_000 });
}
const order = new Map(routes.map((route, index) => [route, index]));
results.sort((a, b) => a.width - b.width || a.theme.localeCompare(b.theme, "en") || order.get(a.route) - order.get(b.route));
await writeFile(resolve(artifacts, "results.json"), JSON.stringify({ origin, production, source: process.env.GITHUB_SHA ?? null, capturedAt: new Date().toISOString(), cleanup: "browser and owned server closed", results }, null, 2) + "\n");
console.log(`Verified ${results.length} route/viewport/theme combinations at ${origin}.`);
