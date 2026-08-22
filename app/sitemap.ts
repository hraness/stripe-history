import type { MetadataRoute } from "next";
import { loadHistory } from "@/lib/content";
import { historyEventPath } from "@/lib/history-urls";

import { SITE_ORIGIN } from "./site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const history = await loadHistory();

  return [
    {
      url: `${SITE_ORIGIN}/`,
    },
    {
      url: `${SITE_ORIGIN}/history/payment-volume`,
    },
    {
      url: `${SITE_ORIGIN}/history/valuation`,
    },
    {
      url: `${SITE_ORIGIN}/about`,
    },
    {
      url: `${SITE_ORIGIN}/contact`,
    },
    {
      url: `${SITE_ORIGIN}/privacy`,
    },
    {
      url: `${SITE_ORIGIN}/data`,
    },
    ...history.categories.map(({ id }) => ({
      url: `${SITE_ORIGIN}/history/${id}`,
    })),
    ...history.events.map((event) => ({
      url: `${SITE_ORIGIN}${historyEventPath(event.categoryId, event.id)}`,
    })),
  ];
}
