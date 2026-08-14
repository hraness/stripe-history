import { SITE_ORIGIN } from "../site";

export function GET(): Response {
  return Response.redirect(`${SITE_ORIGIN}/`, 308);
}
