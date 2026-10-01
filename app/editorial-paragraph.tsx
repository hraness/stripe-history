import { Fragment } from "react";
import Link from "next/link";
import { SITE_ORIGIN } from "./site";
import type { EditorialPart } from "./site-copy";

export function EditorialParagraph({ parts }: Readonly<{ parts: readonly EditorialPart[] }>) {
  return <p>{parts.map((part, index) => {
    if (typeof part === "string") return <Fragment key={index}>{part}</Fragment>;
    if ("code" in part) return <code key={index}>{part.code}</code>;
    if (part.href.startsWith(SITE_ORIGIN + "/")) {
      return <Link href={part.href.slice(SITE_ORIGIN.length)} key={index}>{part.text}</Link>;
    }
    return <a href={part.href} key={index}>{part.text}</a>;
  })}</p>;
}
