"use client";

import { cloneElement, type ReactElement } from "react";
import { AskAiAboutThis } from "@hraness/ui";

export const ASK_AI_LABEL = "Ask AI" as const;

type NavProps = Readonly<{ children: readonly [ReactElement, ReactElement] }>;
type AskAiRender = (props: Readonly<{ className?: string | undefined; url: string }>, ref: null) => ReactElement<NavProps>;

/**
 * The shared Ask AI row (provider links, marks, and styles from @hraness/ui)
 * under the shorter "Ask AI" label. The shared component fixes its label, so
 * this renders it once and swaps only the landmark name and visible label.
 * It is a client module because the package is a client reference on the
 * server, where its render function is not reachable.
 * Replace with a `label` prop once @hraness/ui offers one.
 */
export function AskAi({ className, url }: Readonly<{ className?: string; url: string }>) {
  const render = (AskAiAboutThis as unknown as { render: AskAiRender }).render;
  const nav = render({ className, url }, null);
  const [label, links] = nav.props.children;
  return cloneElement(nav, { "aria-label": ASK_AI_LABEL } as Partial<NavProps>, cloneElement(label, {}, ASK_AI_LABEL), links);
}
