import { defineSocialImageSite, type SocialImagePage } from "@hraness/web-discovery/social-image";
import { SITE_LABEL, site } from "./site";

/**
 * The Hraness Ra mark the site header paints in foil, inlined from
 * `public/marks/hraness-ra.svg` (a test keeps the two identical). The card
 * uses only its alpha.
 */
export const headerMark =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path d="M372 141a116 116 0 1 1-232 0 116 116 0 1 1 232 0Zm-14 0a102 102 0 1 0-204 0 102 102 0 1 0 204 0Zm-8 0a94 94 0 1 1-188 0 94 94 0 1 1 188 0Z" fill="#2474d4" fill-rule="evenodd"/><path d="M211 252c75-8 154 30 204 94 32 40 51 89 59 142H184c20-28 29-57 22-87-9-39-26-71-28-99-2-22 9-39 33-50Z" fill="#2474d4"/><path d="M246 270c-27-20-67-23-100-9-25 11-42 31-46 56l-34 20 38 12c4 25 14 47 31 66 15 13 22 32 18 56l-14 17h116c-20-27-23-50-8-68 6-8 14-14 23-21 23-20 34-50 28-79-5-22-23-40-52-50ZM132 309c9-14 22-22 38-22 13 0 25 7 34 19-10 14-23 22-39 22-14 0-25-6-33-19Z" fill="#2474d4" fill-rule="evenodd"/><path d="M151 410c-2 30-16 57-43 78h197c-19-27-40-49-63-63-28-18-59-23-91-15Z" fill="#2474d4"/><circle cx="166" cy="307" fill="#2474d4" r="8"/></svg>';

/** The one declaration every Stripe History share image renders from. */
export const socialSite = defineSocialImageSite({
  brand: "Hraness",
  brandMark: headerMark,
  description: site.tagline,
  domain: SITE_LABEL,
  name: site.name,
  palette: "paper",
});

/**
 * The home card is the hero: its eyebrow and headline under the header. The
 * hero summary is too long for the card, so the card leaves it out.
 */
export const homeSocialPage: SocialImagePage = {
  description: "",
  eyebrow: site.category,
  headline: site.heroHeading,
  layout: "product",
};
