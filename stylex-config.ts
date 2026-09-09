import type { StylexNextConfigOptions } from "@hraness/ui/stylex-build/next";

/** One package union shared by the production config and build orchestrator. */
export function stylexOptions(rootDirectory: string): StylexNextConfigOptions {
  return {
    rootDirectory,
    packageManifests: [
      "node_modules/@hraness/design-kit/dist/stylex-manifest.json",
      "node_modules/@hraness/site-footer/dist/stylex-manifest.json",
      "node_modules/@hraness/ui/dist/stylex-manifest.json",
    ],
  };
}
