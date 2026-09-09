import { resolve } from "node:path";
import { createStylexTransformCollector } from "@hraness/ui/stylex-build";

// Focused source tests use the same public compiler; native build/browser
// acceptance remains a separate mandatory gate, not implied by this preload.
const root = process.cwd();
const collector = createStylexTransformCollector(root);
const escaped = resolve(root, "app").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
Bun.plugin({
  name: "stripe-history-stylex-source-tests",
  setup(build) {
    build.onLoad({ filter: new RegExp(`^${escaped}/.*\\.stylex\\.ts$`, "u") }, async ({ path }) => {
      const { code: contents } = await collector.transform(await Bun.file(path).text(), path);
      return { contents, loader: "ts" };
    });
  },
});
