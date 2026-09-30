import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  createSocialImageCard,
  socialImageAlt,
  socialImageFit,
  socialImageSiteDetails,
} from "@hraness/web-discovery/social-image";
import OpenGraphImage, { alt, contentType, size } from "./opengraph-image";
import { SITE_LABEL, site } from "./site";
import { headerMark, homeSocialPage, socialSite } from "./social";

describe("share image", () => {
  test("declares the site once from the canonical identity", () => {
    expect(socialSite).toMatchObject({
      brand: "hraness",
      description: site.tagline,
      domain: SITE_LABEL,
      name: site.name,
      palette: "paper",
    });
    expect(socialSite).not.toHaveProperty("icon");
    expect(socialSite).not.toHaveProperty("theme");
    expect(homeSocialPage).toEqual({
      description: "",
      eyebrow: site.category,
      headline: site.heroHeading,
      layout: "product",
    });
    expect(socialImageSiteDetails(socialSite)).toMatchObject({ title: site.name, domain: SITE_LABEL });
  });

  test("paints the header's own Ra mark", () => {
    expect(socialSite.brandMark).toBe(headerMark);
    expect(headerMark).toBe(readFileSync(new URL("../public/marks/hraness-ra.svg", import.meta.url), "utf8").trim());
  });

  test("fits the home card copy as written", () => {
    const details = socialImageSiteDetails(socialSite, homeSocialPage);
    const fit = socialImageFit(details);
    expect(fit.issues).toEqual([]);
    expect(fit.findings).toEqual([]);
    expect(fit.removed).toEqual([]);
    expect(fit.layout).toBe("product");
    expect(fit.description).toBeUndefined();
    expect(fit.headline).toMatchObject({ reduced: false, threeLine: false, truncated: false });
    expect(() => createSocialImageCard({ ...details, strict: true })).not.toThrow();
  });

  test("serves the shared template card with matching alt text", async () => {
    expect(size).toEqual({ height: 630, width: 1200 });
    expect(contentType).toBe("image/png");
    expect(alt).toBe(socialImageAlt(socialSite));
    expect(alt).toBe(site.socialImageAlt);
    const response = OpenGraphImage();
    expect(response.headers.get("content-type")).toBe("image/png");
    const png = new Uint8Array(await response.arrayBuffer());
    const view = new DataView(png.buffer);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);
  });
});
