import assert from "node:assert/strict";
import type { Page } from "playwright-core";

/** Exercise the real compiled timeline without changing authored source or
 * claiming interaction parity for the still-unmigrated event/metric families. */
export async function proveCompiledTimeline(page: Page) {
  const originalTheme = await page.locator("html").getAttribute("data-theme");
  const observations: unknown[] = [];
  const paletteBackgrounds: string[] = [];
  const selected = page.locator('.history-filters a[data-filter-id="all"]');
  const settle = () => page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  try {
    for (const theme of ["light", "dark"] as const) {
      await page.locator("html").evaluate((element, value) => element.setAttribute("data-theme", value), theme);
      await page.setViewportSize({ width: 1280, height: 900 });
      await selected.hover();
      await settle();
      const desktop = await page.evaluate(() => {
        const requireElement = (selector: string) => {
          const element = document.querySelector<HTMLElement>(selector);
          if (!element) throw new Error(`Missing real timeline role: ${selector}`);
          return element;
        };
        const all = requireElement('.history-filters a[data-filter-id="all"]');
        const category = requireElement('.history-filters a[data-filter-id="acquisitions"]');
        const years = [...document.querySelectorAll<HTMLElement>('.history-years > .history-year')];
        const probe = document.createElement("span");
        probe.style.backgroundColor = "var(--hraness-site-accent)";
        probe.style.color = "var(--hraness-site-accent-ink)";
        all.append(probe);
        try {
          const title = getComputedStyle(requireElement('.history-year-title'));
          const chip = getComputedStyle(all);
          return {
            theme: document.documentElement.getAttribute("data-theme"),
            layout: getComputedStyle(requireElement('.history-layout')).display,
            yearsRow: getComputedStyle(requireElement('.history-years')).gridRowStart,
            firstMargin: years[0] ? getComputedStyle(years[0]).marginTop : null,
            laterMargin: years[1] ? getComputedStyle(years[1]).marginTop : null,
            titleSize: title.fontSize, titleWeight: title.fontWeight,
            filterPosition: getComputedStyle(requireElement('.history-filters')).position,
            filterCount: document.querySelectorAll('.history-filters a[data-filter-id]').length,
            selected: all.getAttribute("aria-current"), selectedPath: new URL((all as HTMLAnchorElement).href).pathname,
            hovered: all.matches(":hover"), background: chip.backgroundColor, border: chip.borderTopColor, color: chip.color,
            expectedBackground: getComputedStyle(probe).backgroundColor, expectedColor: getComputedStyle(probe).color,
            countColor: getComputedStyle(requireElement('.history-filters a[data-filter-id="all"] .history-filter-count')).color,
            iconColor: getComputedStyle(requireElement('.history-filters a[data-filter-id="all"] .history-category-icon')).color,
            categoryHue: category.style.getPropertyValue("--history-category-hue"),
            yearCountsMatch: years.every((year) => year.querySelector('.history-year-heading > span')?.textContent === `${year.querySelectorAll('.history-timeline > .history-event').length} events`),
          };
        } finally { probe.remove(); }
      });
      assert.equal(desktop.theme, theme);
      assert.equal(desktop.layout, "grid");
      assert.equal(desktop.yearsRow, "1");
      assert.equal(desktop.firstMargin, "0px");
      assert.equal(desktop.laterMargin, "44px");
      assert.equal(desktop.titleSize, "20px");
      assert.equal(desktop.titleWeight, "500");
      assert.equal(desktop.filterPosition, "sticky");
      assert.equal(desktop.filterCount, 16);
      assert.equal(desktop.selected, "true");
      assert.equal(desktop.selectedPath, "/stripe");
      assert.equal(desktop.hovered, true);
      assert.equal(desktop.background, desktop.expectedBackground);
      assert.equal(desktop.border, desktop.expectedBackground);
      for (const color of [desktop.color, desktop.countColor, desktop.iconColor]) assert.equal(color, desktop.expectedColor);
      assert.notEqual(desktop.categoryHue, "");
      assert.equal(desktop.yearCountsMatch, true);
      paletteBackgrounds.push(desktop.expectedBackground);
      observations.push(desktop);
    }
    assert.notEqual(paletteBackgrounds[0], paletteBackgrounds[1], "The real light and dark accent palettes must differ");
    await page.setViewportSize({ width: 390, height: 844 });
    await settle();
    // CSSOM may omit the default proximity keyword. Compare against a native
    // reference with the exact authored contract, not a list of accepted strings.
    const snapReference = await page.evaluate(() => {
      const probe = document.createElement("div");
      document.body.append(probe);
      try {
        probe.style.scrollSnapType = "inline proximity";
        const proximity = getComputedStyle(probe).scrollSnapType;
        probe.style.scrollSnapType = "inline mandatory";
        const mandatory = getComputedStyle(probe).scrollSnapType;
        probe.style.scrollSnapType = "none";
        const none = getComputedStyle(probe).scrollSnapType;
        return { proximity, mandatory, none };
      } finally { probe.remove(); }
    });
    assert.equal(snapReference.mandatory, "inline mandatory");
    assert.equal(snapReference.none, "none");
    assert.notEqual(snapReference.proximity, snapReference.mandatory);
    assert.notEqual(snapReference.proximity, snapReference.none);
    const mobile = await page.evaluate(() => {
      const nav = document.querySelector<HTMLElement>('.history-filters')!;
      const list = getComputedStyle(nav.querySelector('ul')!);
      const cue = getComputedStyle(nav, "::after");
      return {
        layout: getComputedStyle(document.querySelector('.history-layout')!).display,
        laterMargin: getComputedStyle(document.querySelectorAll('.history-year')[1]!).marginTop,
        flexWrap: list.flexWrap, overflow: list.overflowX, snap: list.scrollSnapType,
        scrollbar: list.scrollbarWidth, endPadding: list.paddingInlineEnd,
        cueContent: cue.content, cueWidth: cue.inlineSize, cuePointerEvents: cue.pointerEvents,
      };
    });
    assert.deepEqual(mobile, {
      layout: "block", laterMargin: "32px", flexWrap: "nowrap", overflow: "auto", snap: snapReference.proximity,
      scrollbar: "none", endPadding: "32px", cueContent: '""', cueWidth: "28px", cuePointerEvents: "none",
    });
    observations.push({ ...mobile, snapReference });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ forcedColors: "active" });
    await page.keyboard.press("Tab");
    await selected.focus();
    await selected.hover();
    await settle();
    const forced = await selected.evaluate((element) => {
      const probe = document.createElement("span");
      probe.style.forcedColorAdjust = "none";
      probe.style.backgroundColor = "Highlight";
      probe.style.color = "HighlightText";
      element.append(probe);
      try {
        const style = getComputedStyle(element);
        const expected = getComputedStyle(probe);
        return {
          forcedColorsActive: matchMedia("(forced-colors: active)").matches,
          focusVisible: element.matches(":focus-visible"), hovered: element.matches(":hover"),
          color: style.color, background: style.backgroundColor, border: style.borderTopColor,
          outlineColor: style.outlineColor, outlineWidth: style.outlineWidth, outlineOffset: style.outlineOffset,
          shadow: style.boxShadow, expectedColor: expected.color, expectedBackground: expected.backgroundColor,
        };
      } finally { probe.remove(); }
    });
    assert.equal(forced.forcedColorsActive, true);
    assert.equal(forced.focusVisible, true);
    assert.equal(forced.hovered, true);
    assert.equal(forced.background, forced.expectedBackground);
    assert.equal(forced.border, forced.expectedBackground);
    assert.equal(forced.color, forced.expectedColor);
    assert.equal(forced.outlineColor, forced.expectedColor);
    assert.equal(forced.outlineWidth, "2px");
    assert.equal(forced.outlineOffset, "-4px");
    assert.equal(forced.shadow, "none");
    observations.push(forced);
    return observations;
  } finally {
    await page.emulateMedia({ forcedColors: "none" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator("html").evaluate((element, value) => value === null ? element.removeAttribute("data-theme") : element.setAttribute("data-theme", value), originalTheme);
  }
}
