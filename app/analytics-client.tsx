"use client";

import type { Analytics } from "@hraness/analytics/browser";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import {
  analyticsConfig,
  isProductEvent,
  PRIVACY_CHOICES_PATH,
  stripeHistoryPageKind,
  type ProductEvent,
} from "./analytics";

type Client = Analytics<ProductEvent>;

let client: Client | undefined;
let starting: Promise<Client> | undefined;
let pendingChoices = false;

/** Bounded label text: event ids, category ids and host names only. */
function label(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return /^[a-z0-9.:-]{1,120}$/iu.test(trimmed) ? trimmed : undefined;
}

function placementOf(element: Element): string {
  if (element.closest("footer") !== null) return "footer";
  if (element.closest("header") !== null) return "nav";
  return "inline";
}

/** Reports the product's own click markers and links that leave hraness.com. */
function onClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  if (target === null || client === undefined) return;
  const marked = target.closest("[data-analytics-event]");
  const name = marked?.getAttribute("data-analytics-event");
  if (marked !== null && marked !== undefined && isProductEvent(name)) {
    const id = label(marked.getAttribute("data-analytics-id"));
    const kind = label(marked.getAttribute("data-analytics-kind"));
    client.track(name, { ...(id === undefined ? {} : { id }), ...(kind === undefined ? {} : { kind }) });
  }
  const cta = target.closest("[data-analytics-cta]");
  const ctaName = label(cta?.getAttribute("data-analytics-cta"));
  if (cta !== null && cta !== undefined && ctaName !== undefined) {
    client.track("cta clicked", { cta: ctaName, placement: placementOf(cta) });
  }
  const link = target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return;
  let url: URL;
  try {
    url = new URL(link.href);
  } catch {
    return;
  }
  if (url.origin === location.origin || !/^https?:$/u.test(url.protocol)) return;
  client.track("outbound link opened", { target_host: url.hostname, placement: placementOf(link) });
}

function start(): Promise<Client> {
  starting ??= import("@hraness/analytics/browser").then(({ createAnalytics }) => {
    client = createAnalytics<ProductEvent>(analyticsConfig(location.pathname));
    document.addEventListener("click", onClick, { capture: true });
    if (pendingChoices) {
      pendingChoices = false;
      client.privacyChoices();
    }
    return client;
  });
  return starting;
}

/** Starts the shared Hraness analytics client once per document. */
export function SiteAnalytics() {
  const pathname = usePathname();
  useEffect(() => { void start(); }, []);
  // Client navigation keeps one PostHog instance; later events carry the new page kind.
  useEffect(() => {
    client?.describe({ page_kind: stripeHistoryPageKind(`/stripe${pathname === "/" ? "" : pathname}`) });
  }, [pathname]);
  return null;
}

/** Sends `page not found` once for each 404 render. */
export function PageNotFoundAnalytics() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void start().then((analytics) => {
      analytics.describe({ page_kind: "not_found" });
      analytics.track("page not found");
    });
  }, []);
  return null;
}

/**
 * The "Your Privacy Choices" link: it turns off recordings (and any ads) for
 * this browser at once, then opens the privacy page's choices.
 */
export function PrivacyChoicesLink({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <a
      className={className}
      href={PRIVACY_CHOICES_PATH}
      onClick={() => {
        if (client === undefined) pendingChoices = true;
        else client.privacyChoices();
      }}
    >
      {children}
    </a>
  );
}
