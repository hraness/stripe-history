import { absoluteSiteUrl } from "../site";

/** Events are listed on the timeline; `/events` itself is not a page. */
export function GET(): Response {
  return Response.redirect(absoluteSiteUrl("/"), 308);
}
