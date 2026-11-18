import type { StylexNextConfigOptions } from "@hraness/ui/stylex-build/next";

/** One package union shared by the production config and build orchestrator. */
export function stylexOptions(rootDirectory: string): StylexNextConfigOptions {
  return {
    nextVersion: "16.4.6",
    rootDirectory,
    packageManifests: [
      "node_modules/@hraness/ui/dist/stylex-manifest.json",
    ],
  };
}
