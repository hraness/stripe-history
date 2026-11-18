import type { Page } from "playwright-core";

export interface PublicationLinkGroup {
  name: string;
  selector: string;
  /** False when the group's links keep their text colour as underline ink at rest. */
  mutedRest?: boolean;
  /** False when the page may have no visible link in this group; the group is then skipped. */
  required?: boolean;
}

export declare const publicationLinkGroups: PublicationLinkGroup[];

/** Throws unless each group's links keep a dotted underline at rest, on hover and on focus, with and without forced colours. */
export declare function verifyPublicationLinks(page: Page, groups?: PublicationLinkGroup[]): Promise<unknown[]>;
