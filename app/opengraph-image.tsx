import {
  createSiteSocialImageResponse,
  socialImageAlt,
  socialImageContentType,
  socialImageSize,
} from "@hraness/web-discovery/social-image";
import { homeSocialPage, socialSite } from "./social";

export const alt = socialImageAlt(socialSite);
export const contentType = socialImageContentType;
export const size = socialImageSize;

export default function OpenGraphImage() {
  return createSiteSocialImageResponse(socialSite, homeSocialPage);
}
