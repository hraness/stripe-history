import assert from "node:assert/strict";
import { setTimeout as wait } from "node:timers/promises";
import type { BrowserContext, Page } from "playwright-core";

const paths = ["/stripe", "/stripe/history/payment-volume", "/stripe/history/net-revenue", "/stripe/history/valuation"] as const;

/** Observe the actual four server-rendered producers. References resolve the
 * original authored token values in the same native cascade, not recipe output. */
export async function proveCompiledEvents(page: Page) {
  const originalUrl = page.url();
  const origin = new URL(originalUrl).origin;
  const originalTheme = await page.locator("html").getAttribute("data-theme");
  const observations: unknown[] = [];
  const palettes: string[] = [];
  let coarseContext: BrowserContext | undefined;
  let coarseClosed = false;
  const settle = () => page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  try {
    for (const path of paths) {
      await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
      for (const theme of ["light", "dark"] as const) {
        await page.locator("html").evaluate((node, value) => node.setAttribute("data-theme", value), theme);
        await page.setViewportSize({ width: 1280, height: 900 });
        await settle();
        const desktop = await page.evaluate(() => {
          const require = (selector: string) => {
            const node = document.querySelector<HTMLElement>(selector);
            if (!node) throw new Error(`Missing real event role: ${selector}`);
            return node;
          };
          const facts = require(".history-event-facts");
          const kicker = require(".history-event-kicker");
          const source = require(".history-event-sources a");
          const term = facts.querySelector("dt")!;
          const value = facts.querySelector("dd")!;
          const type = document.querySelector<HTMLElement>(".history-event-type");
          const frame = document.querySelector<HTMLElement>(".history-event:has(.history-event-facts)");
          const sample = frame ?? facts;
          const probe = document.createElement("span");
          probe.style.color = "var(--history-category-ink)";
          probe.style.backgroundColor = "var(--history-category-soft)";
          probe.style.fontSize = "var(--text-caption)";
          sample.append(probe);
          const borderProbe = document.createElement("span");
          borderProbe.style.border = "1px solid color-mix(in oklch, var(--history-category-ink) 30%, var(--plain-line))";
          type?.append(borderProbe);
          try {
            const date = getComputedStyle(kicker.querySelector("time")!);
            const title = frame?.querySelector("h3");
            const eventType = frame?.querySelector(".history-event-type");
            return {
              path: location.pathname, theme: document.documentElement.getAttribute("data-theme"),
              factsFont: getComputedStyle(facts).fontSize, kickerFont: getComputedStyle(kicker).fontSize,
              sourceFont: getComputedStyle(source.parentElement!.parentElement!).fontSize,
              expectedCaption: getComputedStyle(probe).fontSize, dateFont: date.fontSize, dateNumeric: date.fontVariantNumeric,
              factsDisplay: getComputedStyle(facts).display, factsMargin: getComputedStyle(facts).marginTop,
              rowDisplay: getComputedStyle(facts.querySelector("div")!).display,
              termMargin: getComputedStyle(term).margin, valueMargin: getComputedStyle(value).margin,
              valueNumeric: getComputedStyle(value).fontVariantNumeric,
              sourceDisplay: getComputedStyle(source).display, sourceMinHeight: getComputedStyle(source).minHeight,
              sourceAlign: getComputedStyle(source.parentElement!.parentElement!).textAlign,
              type: type ? { minHeight: getComputedStyle(type).minHeight, border: getComputedStyle(type).borderTopWidth,
                expectedBorder: getComputedStyle(borderProbe).borderTopWidth, categoryInk: getComputedStyle(type).getPropertyValue("--history-category-ink"), radius: getComputedStyle(type).borderRadius } : null,
              timeline: frame && title && eventType ? {
                id: frame.querySelector("article")!.id, category: frame.getAttribute("data-category"),
                count: document.querySelectorAll(".history-timeline > .history-event").length,
                startBorder: getComputedStyle(frame).borderInlineStartWidth, topBorder: getComputedStyle(frame).borderTopWidth,
                paddingTop: getComputedStyle(frame).paddingTop, paddingLeft: getComputedStyle(frame).paddingLeft,
                borderColor: getComputedStyle(frame).borderInlineStartColor, expectedInk: getComputedStyle(probe).color,
                chipBackground: getComputedStyle(eventType).backgroundColor, expectedBackground: getComputedStyle(probe).backgroundColor,
                titleSize: getComputedStyle(title).fontSize, titleWeight: getComputedStyle(title).fontWeight,
                lastBorders: [...document.querySelectorAll(".history-timeline")].every((list) => [...list.children].every((item, index) => getComputedStyle(item).borderBottomWidth === (index === list.children.length - 1 ? "1px" : "0px"))),
                navBorder: getComputedStyle(require(".history-filters")).borderBottomWidth,
                yearBorder: getComputedStyle(require(".history-year-heading")).borderTopWidth,
                filterMinHeight: getComputedStyle(require(".history-filter-link")).minHeight,
              } : null,
            };
          } finally { probe.remove(); borderProbe.remove(); }
        });
        assert.equal(desktop.path, path);
        assert.equal(desktop.theme, theme);
        assert.equal(desktop.expectedCaption, "12px");
        for (const value of [desktop.factsFont, desktop.kickerFont, desktop.sourceFont, desktop.dateFont]) assert.equal(value, "12px");
        assert.equal(desktop.dateNumeric, "tabular-nums");
        assert.equal(desktop.factsDisplay, "grid");
        assert.equal(desktop.factsMargin, "10.4px");
        assert.equal(desktop.rowDisplay, "grid");
        assert.equal(desktop.termMargin, "0px");
        assert.equal(desktop.valueMargin, "0px");
        assert.equal(desktop.valueNumeric, "tabular-nums");
        assert.equal(desktop.sourceDisplay, "inline-block");
        assert.equal(desktop.sourceMinHeight, "24px");
        assert.equal(desktop.sourceAlign, "end");
        if (path === "/stripe/history/valuation") assert.equal(desktop.type, null);
        else {
          assert.ok(desktop.type);
          assert.equal(desktop.type.minHeight, "26.4px");
          assert.equal(desktop.type.radius, "999px");
          assert.equal(desktop.type.border, desktop.type.expectedBorder);
          assert.equal(desktop.type.expectedBorder, path === "/stripe" ? "1px" : "0px");
          assert.equal(desktop.type.categoryInk.length > 0, path === "/stripe");
        }
        if (path === "/stripe") {
          assert.ok(desktop.timeline);
          assert.ok(desktop.timeline.count >= 200);
          assert.ok(desktop.timeline.id && desktop.timeline.category);
          assert.equal(desktop.timeline.startBorder, "3px");
          assert.equal(desktop.timeline.topBorder, "1px");
          assert.equal(desktop.timeline.paddingTop, "16px");
          assert.equal(desktop.timeline.paddingLeft, "14.4px");
          assert.equal(desktop.timeline.borderColor, desktop.timeline.expectedInk);
          assert.equal(desktop.timeline.chipBackground, desktop.timeline.expectedBackground);
          assert.equal(desktop.timeline.titleSize, "16.8px");
          assert.equal(desktop.timeline.titleWeight, "600");
          assert.equal(desktop.timeline.lastBorders, true);
          assert.equal(desktop.timeline.navBorder, "1px");
          assert.equal(desktop.timeline.yearBorder, "1px");
          assert.equal(desktop.timeline.filterMinHeight, "34px");
          palettes.push(desktop.timeline.expectedInk);
        } else assert.equal(desktop.timeline, null);
        observations.push(desktop);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await settle();
      const mobile = await page.evaluate(() => {
        const row = document.querySelector(".history-event-facts > div")!;
        const frame = document.querySelector(".history-event");
        return { path: location.pathname, rowDisplay: getComputedStyle(row).display,
          frame: frame ? { padding: getComputedStyle(frame).padding, titleSize: getComputedStyle(frame.querySelector("h3")!).fontSize,
            titleLine: getComputedStyle(frame.querySelector("h3")!).lineHeight, summaryLine: getComputedStyle(frame.querySelector("article > p")!).lineHeight } : null };
      });
      assert.equal(mobile.path, path);
      assert.equal(mobile.rowDisplay, "block");
      assert.deepEqual(mobile.frame, path === "/stripe" ? { padding: "12.8px 0px 12.8px 11.2px", titleSize: "16px", titleLine: "22.4px", summaryLine: "24px" } : null);
      observations.push(mobile);
      if (path === "/stripe/history/payment-volume" || path === "/stripe/history/net-revenue") {
        await page.emulateMedia({ forcedColors: "active" });
        await settle();
        const metricBorder = await page.locator(".history-event-type").first().evaluate((node) => {
          const probe = document.createElement("span");
          // The original forced rule replaced color only, not the invalid
          // shorthand's initial none border style and resulting zero width.
          probe.style.border = "1px solid color-mix(in oklch, var(--history-category-ink) 30%, var(--plain-line))";
          probe.style.borderColor = "CanvasText";
          node.append(probe);
          try { return { active: matchMedia("(forced-colors: active)").matches,
            width: getComputedStyle(node).borderTopWidth, style: getComputedStyle(node).borderTopStyle,
            expectedWidth: getComputedStyle(probe).borderTopWidth, expectedStyle: getComputedStyle(probe).borderTopStyle }; }
          finally { probe.remove(); }
        });
        assert.deepEqual(metricBorder, { active: true, width: "0px", style: "none", expectedWidth: "0px", expectedStyle: "none" });
        observations.push({ path, metricBorder });
        await page.emulateMedia({ forcedColors: "none" });
      }
    }
    assert.notEqual(palettes[0], palettes[1], "Both real category palettes must be observed");
    await page.goto(`${origin}/stripe`, { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 1280, height: 900 });
    const chip = page.locator(".history-event-type").first();
    await chip.hover();
    assert.equal(await chip.evaluate((node) => getComputedStyle(node).textDecorationLine), "none");
    let tabPresses = 0;
    let reached = false;
    const traversalDeadline = Date.now() + 10000;
    // Keep input serial: a detached timeout race could otherwise continue
    // sending Tab while the enclosing failure cleanup restores the page.
    while (tabPresses < 128 && !reached) {
      assert.ok(Date.now() < traversalDeadline, "Native keyboard traversal exceeded its bound");
      await page.keyboard.press("Tab");
      tabPresses++;
      reached = await chip.evaluate((node) => node === document.activeElement);
    }
    assert.equal(reached, true, "The real first event chip must be reachable with native Tab input");
    await settle();
    const focus = await chip.evaluate((node) => {
      const css = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
      const top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom);
      const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
      return {
        ring: { focusVisible: node.matches(":focus-visible"), radius: css.borderRadius, style: css.outlineStyle, width: css.outlineWidth, offset: css.outlineOffset },
        visibility: { width: rect.width, height: rect.height, visibleWidth: right - left, visibleHeight: bottom - top, hit: hit !== null && node.contains(hit) },
      };
    });
    assert.deepEqual(focus.ring, { focusVisible: true, radius: "1px", style: "dotted", width: "1px", offset: "3px" });
    for (const dimension of [focus.visibility.width, focus.visibility.height, focus.visibility.visibleWidth, focus.visibility.visibleHeight]) assert.ok(dimension > 0);
    assert.equal(focus.visibility.hit, true, "The natively focused chip must be visible and hit-testable");
    observations.push({ focus, nativeTabPresses: tabPresses });
    await page.emulateMedia({ forcedColors: "active" });
    await settle();
    const forced = await chip.evaluate((node) => {
      const probe = document.createElement("span");
      probe.style.forcedColorAdjust = "none";
      probe.style.color = "CanvasText";
      probe.style.backgroundColor = "Canvas";
      node.append(probe);
      try { const css = getComputedStyle(node); const reference = getComputedStyle(probe); return {
        active: matchMedia("(forced-colors: active)").matches, color: css.color, background: css.backgroundColor,
        border: css.borderTopColor, startBorder: getComputedStyle(node.closest(".history-event")!).borderInlineStartColor,
        expectedColor: reference.color, expectedBackground: reference.backgroundColor,
      }; } finally { probe.remove(); }
    });
    assert.equal(forced.active, true);
    assert.equal(forced.color, forced.expectedColor);
    assert.equal(forced.border, forced.expectedColor);
    assert.equal(forced.startBorder, forced.expectedColor);
    assert.equal(forced.background, forced.expectedBackground);
    observations.push({ forced });

    const browser = page.context().browser();
    assert.ok(browser);
    coarseContext = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    await coarseContext.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const coarsePage = await coarseContext.newPage();
    const pageErrors: string[] = [];
    coarsePage.on("pageerror", (error) => pageErrors.push(error.message));
    for (const path of paths) {
      await coarsePage.goto(`${origin}${path}`, { waitUntil: "networkidle" });
      const coarse = await coarsePage.evaluate(() => ({ path: location.pathname, active: matchMedia("(pointer: coarse)").matches,
        roles: [...document.querySelectorAll(".history-event-type, .history-event-sources a")].map((node) => {
          const css = getComputedStyle(node); return { minHeight: css.minHeight, display: css.display, align: css.alignItems, height: node.getBoundingClientRect().height,
            padding: node.classList.contains("history-event-type") ? css.paddingInline : null };
        }) }));
      assert.equal(coarse.path, path);
      assert.equal(coarse.active, true);
      assert.ok(coarse.roles.length > 0);
      for (const role of coarse.roles) {
        assert.equal(role.minHeight, "48px");
        assert.equal(role.display, "inline-flex");
        assert.equal(role.align, "center");
        assert.ok(role.height >= 48);
        if (role.padding !== null) assert.equal(role.padding, "12px");
      }
      observations.push(coarse);
    }
    assert.deepEqual(pageErrors, []);
  } finally {
    // The outer harness also closes the browser and proves all PID/listener
    // absence if any assertion or this bounded context close fails.
    try {
      if (coarseContext) {
        await Promise.race([coarseContext.close(), wait(10000, undefined, { ref: false }).then(() => { throw new Error("Coarse event context did not close within its bound"); })]);
        coarseClosed = true;
      }
    }
    finally {
      await page.emulateMedia({ forcedColors: "none" });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(originalUrl, { waitUntil: "networkidle" });
      await page.locator("html").evaluate((node, value) => value === null ? node.removeAttribute("data-theme") : node.setAttribute("data-theme", value), originalTheme);
    }
  }
  assert.equal(coarseClosed, true);
  return { observations, coarseContextClosed: coarseClosed };
}
