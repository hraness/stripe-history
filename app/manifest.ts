import type { MetadataRoute } from "next";
import { site } from "./site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: site.historyTitle,
    short_name: site.applicationName,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
