import type { MetadataRoute } from "next";
import { historyEventPath, newestEventDate } from "@/lib/event-page";
import { loadSiteHistory } from "@/lib/site-history";

import { absoluteSiteUrl } from "./site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const history = await loadSiteHistory();

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
    ...history.categories.map(({ id }) => {
      const lastModified = newestEventDate(history.events.filter(({ categoryId }) => categoryId === id));
      return {
        url: absoluteSiteUrl(`/history/${id}`),
        ...(lastModified === undefined ? {} : { lastModified }),
      };
    }),
    ...history.events.map(({ id }) => ({
      url: absoluteSiteUrl(historyEventPath(id)),
    })),
  ];
}
