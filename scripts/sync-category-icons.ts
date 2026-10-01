import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { historyCategoryIcons } from "../lib/history-category-icons";

/** Preserve the existing Hugeicons geometry and stroke while sharing it across event rows. */
export function categoryIconSprite(): string {
  return renderToStaticMarkup(createElement("svg", { xmlns: "http://www.w3.org/2000/svg" },
    ...Object.entries(historyCategoryIcons).map(([id, icon]) =>
      createElement("symbol", {
        id,
        key: id,
        viewBox: "0 0 24 24",
      }, ...icon.map(([tag, attributes]) => createElement(tag, {
          ...attributes,
          ...(attributes.strokeWidth === undefined ? {} : { strokeWidth: 1.7 }),
        })))
    ),
  )) + "\n";
}

if (import.meta.main) {
  await Bun.write(new URL("../public/history-category-icons.svg", import.meta.url), categoryIconSprite());
  console.log(`Synced ${Object.keys(historyCategoryIcons).length} category glyphs from locked Hugeicons.`);
}
