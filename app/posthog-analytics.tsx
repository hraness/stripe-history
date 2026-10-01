"use client";

import { useEffect, useRef } from "react";
import { getBrowserConsent } from "@hraness/posthog/consent";

import {
  captureAnalyticsException,
  capturePageNotFound,
  initializePostHog,
  installExceptionCapture,
} from "./posthog";

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
    return consent.subscribe(() => { void initializePostHog({ apiHost, apiKey }); });
  }, [apiHost, apiKey]);
  useEffect(() => installExceptionCapture(), []);

  return null;
}

/** Sends `page not found` once for each 404 render. */
export function PageNotFoundAnalytics() {
  const sent = useRef(false);
  useEffect(() => {
    const consent = getBrowserConsent();
    if (consent === undefined) return;
    return consent.subscribe(() => {
      if (sent.current || !consent.allowed()) return;
      sent.current = true;
      capturePageNotFound();
    });
  }, []);

  return null;
}

/** Reports the error a React error boundary caught, once per error. */
export function ErrorBoundaryAnalytics({ error }: Readonly<{ error: unknown }>) {
  useEffect(() => {
    captureAnalyticsException(error, "react_error_boundary");
  }, [error]);

  return null;
}
