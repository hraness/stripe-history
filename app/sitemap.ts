import type { MetadataRoute } from "next";
import { loadHistory } from "@/lib/content";

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
      url: `${SITE_ORIGIN}/data`,
    },
    ...history.categories.map(({ id }) => ({
      url: `${SITE_ORIGIN}/history/${id}`,
    })),
  ];
}
