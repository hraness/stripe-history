import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = fileURLToPath(new URL("../", import.meta.url));
const production = process.argv.includes("--production");
assert.ok(process.argv.slice(2).every(argument => argument === "--production"), "Unknown argument");
const routes = ["/stripe", "/stripe/data", "/stripe/about", "/stripe/history/valuation", "/stripe/history/payment-volume", "/stripe/history/net-revenue", "/stripe/history/appearances", "/stripe/contact", "/stripe/privacy"];
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
  browser = await chromium.launch();
  for (const width of [360, 390, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: width === 360 ? 740 : width === 390 ? 844 : 900 }, colorScheme: theme, hasTouch: width < 600, isMobile: width < 600 });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      for (const route of routes) {
        const response = await page.goto(origin + route);
        assert.equal(response?.status(), 200, route);
        await page.locator("main").waitFor();
        await page.evaluate(() => document.fonts.ready);
        // Full-page captures include portraits below the lazy-loading threshold.
        // Load their real assets before capturing, rather than recording blanks.
        await page.locator("img").evaluateAll(images => images.forEach(image => { image.loading = "eager"; }));
        await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0), null, { timeout: 10_000 });
        await page.locator("img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
        const state = await page.evaluate(() => {
          const footer = document.querySelector("#hraness-site-footer");
          return {
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
            heading: document.querySelector("h1")?.textContent?.trim(),
            theme: document.documentElement.dataset.theme,
            footerPositions: [footer, footer?.querySelector(".hraness-site-footer__inner")].map(element => element ? getComputedStyle(element).position : null),
            smallHeaderTargets: innerWidth > 600 ? [] : [...document.querySelectorAll(".stripe-history-header a, .stripe-history-header button, .stripe-history-header summary")].filter(element => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.width < 43.5 || box.height < 43.5); }).map(element => ({ label: element.textContent?.trim() || element.getAttribute("aria-label"), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
          };
        });
        const name = `${width}-${theme}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "_")}`;
        const screenshot = await page.screenshot({ path: resolve(artifacts, `${name}.png`), fullPage: false, animations: "disabled" });
        state.screenshotWidth = screenshot.readUInt32BE(16);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        await page.screenshot({ path: resolve(artifacts, `${name}-bottom.png`), animations: "disabled" });
        await writeFile(resolve(artifacts, `${name}.json`), JSON.stringify({ route, state, errors }, null, 2));
        assert.ok(!state.overflow, `${route}: horizontal overflow at ${width}`);
        assert.equal(state.screenshotWidth, width, `${route}: capture exceeds viewport`);
        assert.ok(state.heading, `${route}: missing heading`);
        assert.equal(state.theme, theme, `${route}: system appearance`);
        assert.ok(state.footerPositions.every(position => position === "static" || position === "relative"), `${route}: footer not in normal flow`);
        assert.deepEqual(state.smallHeaderTargets, [], `${route}: phone targets below 44px`);
        assert.deepEqual(errors, [], `${route}: browser errors`);
        results.push({ route, width, theme });
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
      const themeMenu = page.locator(".hraness-design-palette-menu");
      await page.waitForFunction(() => document.querySelector(".hraness-design-palette-menu")?.dataset.ready === "true");
      await themeMenu.locator(":scope > summary").click();
      const targetTheme = theme === "light" ? "dark" : "light";
      await page.getByRole("radio", { name: new RegExp(`^${targetTheme}$`, "iu") }).check();
      await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, targetTheme);
      await page.reload();
      await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, targetTheme);
      await page.locator("header").getByRole("link", { name: "data", exact: true }).click();
      await page.waitForURL(url => url.pathname === "/stripe/data");
      assert.deepEqual(errors, [], "Browser errors after appearance and navigation");
    } finally { await context.close(); }
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
await writeFile(resolve(artifacts, "results.json"), JSON.stringify({ origin, production, source: process.env.GITHUB_SHA ?? null, capturedAt: new Date().toISOString(), cleanup: "browser and owned server closed", results }, null, 2) + "\n");
console.log(`Verified ${results.length} route/viewport/theme combinations at ${origin}.`);
