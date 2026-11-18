import { Fragment } from "react";
import Link from "next/link";
import { isFilePath, SITE_ORIGIN } from "./site";
import type { EditorialPart } from "./site-copy";

export function EditorialParagraph({ parts }: Readonly<{ parts: readonly EditorialPart[] }>) {
  return <p>{parts.map((part, index) => {
    if (typeof part === "string") return <Fragment key={index}>{part}</Fragment>;
    if ("code" in part) return <code key={index}>{part.code}</code>;
    // The router takes a link to one of the site's pages; a file (isFilePath) gets a plain link.
    if (part.reload !== true && part.href.startsWith(SITE_ORIGIN + "/") && !isFilePath(new URL(part.href).pathname)) {
      return <Link href={part.href.slice(SITE_ORIGIN.length)} key={index}>{part.text}</Link>;
    }
    return <a href={part.href} key={index}>{part.text}</a>;
  })}</p>;
}
