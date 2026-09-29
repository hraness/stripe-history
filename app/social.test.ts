import { describe, expect, test } from "bun:test";
import { socialImageAlt, socialImageSiteDetails } from "@hraness/web-discovery/social-image";
import OpenGraphImage, { alt, contentType, size } from "./opengraph-image";
import { SITE_LABEL, site } from "./site";
import { socialSite } from "./social";

describe("share image", () => {
  test("declares the site once from the canonical identity", () => {
    expect(socialSite).toMatchObject({
      description: site.tagline,
      domain: SITE_LABEL,
      icon: { kind: "mark" },
      name: site.name,
      theme: { accent: "#2474D4", background: "#FFFFFF", foreground: "#171717", muted: "#666666" },
    });
    expect(socialSite.icon?.src).toStartWith("data:image/svg+xml,");
    expect(decodeURIComponent(socialSite.icon?.src ?? "")).toContain("viewBox='0 0 541 581'");
    expect(socialImageSiteDetails(socialSite)).toMatchObject({ title: site.name, domain: SITE_LABEL });
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
