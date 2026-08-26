import type { MetadataRoute } from "next";
import { publicSitePath, site } from "./site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: publicSitePath("/"),
    name: site.historyTitle,
    short_name: site.applicationName,
    description: site.description,
    start_url: publicSitePath("/"),
    scope: `${publicSitePath("/")}/`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: publicSitePath("/icon.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
