"use client";

import { useEffect } from "react";
import { getBrowserConsent } from "@hraness/posthog/consent";

import { initializePostHog } from "./posthog";

export function PostHogAnalytics({
  apiHost,
  apiKey,
}: Readonly<{
  apiHost?: string | undefined;
  apiKey?: string | undefined;
}>) {
  useEffect(() => {
    const consent = getBrowserConsent();
    if (consent === undefined) return;
    const initialize = () => { void initializePostHog({ apiHost, apiKey }); };
    return consent.subscribe(initialize);
  }, [apiHost, apiKey]);

  return null;
}
