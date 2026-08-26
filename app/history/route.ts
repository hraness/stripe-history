import { absoluteSiteUrl } from "../site";

export function GET(): Response {
  return Response.redirect(absoluteSiteUrl("/"), 308);
}
