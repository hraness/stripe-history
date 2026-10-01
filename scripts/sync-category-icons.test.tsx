import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { historyCategoryIcons } from "../lib/history-category-icons";
import { HistoryCategoryIcon } from "../app/history/category-icon";
import { categoryIconSprite } from "./sync-category-icons";

test("shared category symbols preserve every locked glyph and its current stroke", async () => {
  const sprite = await Bun.file(new URL("../public/history-category-icons.svg", import.meta.url)).text();
  expect(sprite).toBe(categoryIconSprite());
  for (const [id, icon] of Object.entries(historyCategoryIcons)) {
    const original = renderToStaticMarkup(<HugeiconsIcon color="currentColor" icon={icon} size={16} strokeWidth={1.7} />);
    const paths = original.slice(original.indexOf(">") + 1, original.lastIndexOf("</svg>"));
    expect(sprite).toContain(`<symbol id="${id}" viewBox="0 0 24 24">${paths}</symbol>`);
    const use = renderToStaticMarkup(<HistoryCategoryIcon filterId={id as keyof typeof historyCategoryIcons} />);
    expect(use).toContain(`href="/stripe/history-category-icons.svg#${id}"`);
    expect(use).not.toContain("<path");
    expect(use).toContain('aria-hidden="true"');
  }
});
