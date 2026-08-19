"use client";

import { useEffect } from "react";

import { initializePostHog } from "./posthog";

export function PostHogAnalytics({
  apiHost,
  apiKey,
}: Readonly<{
  apiHost?: string | undefined;
  apiKey?: string | undefined;
}>) {
  useEffect(() => {
    void initializePostHog({ apiHost, apiKey });
  }, [apiHost, apiKey]);

  return null;
}
