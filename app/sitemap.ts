import type { MetadataRoute } from "next";
import { loadHistory } from "@/lib/content";

import { absoluteSiteUrl } from "./site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const history = await loadHistory();

  return [
    {
      url: absoluteSiteUrl("/"),
    },
    {
      url: absoluteSiteUrl("/history/payment-volume"),
    },
    {
      url: absoluteSiteUrl("/history/net-revenue"),
    },
    {
      url: absoluteSiteUrl("/history/valuation"),
    },
    {
      url: absoluteSiteUrl("/about"),
    },
    {
      url: absoluteSiteUrl("/contact"),
    },
    {
      url: absoluteSiteUrl("/privacy"),
    },
    {
      url: absoluteSiteUrl("/data"),
    },
    ...history.categories.map(({ id }) => ({
      url: absoluteSiteUrl(`/history/${id}`),
    })),
  ];
}
