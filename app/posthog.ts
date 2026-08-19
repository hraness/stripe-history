"use client";

import type { CaptureResult, PostHogConfig } from "posthog-js";

import {
  canonicalAnalyticsUrl,
  classifyPublicAnalyticsRoute,
  POSTHOG_API_HOST,
  POSTHOG_COOKILESS_DISTINCT_ID,
} from "./analytics";

const PUBLIC_PROJECT_KEY = /^phc_[A-Za-z0-9_-]{10,}$/u;

export type AnalyticsRuntimeEvidence = Readonly<{
  href: string;
  production: boolean;
}>;

export type PostHogInitializationOptions = Readonly<{
  apiHost?: string | undefined;
  apiKey?: string | undefined;
  evidence?: AnalyticsRuntimeEvidence | undefined;
}>;

let initialization: Promise<boolean> | null = null;

function browserEvidence(): AnalyticsRuntimeEvidence | null {
  if (typeof window === "undefined") return null;
  return {
    href: window.location.href,
    production: process.env.NODE_ENV === "production",
  };
}

function acceptedApiHost(value: string | undefined): string | null {
  const candidate = value ?? POSTHOG_API_HOST;
  return candidate === POSTHOG_API_HOST ? candidate : null;
}

export function isPostHogEligible(
  options: PostHogInitializationOptions,
): boolean {
  const evidence = options.evidence ?? browserEvidence();
  return Boolean(
    evidence?.production
    && options.apiKey !== undefined
    && PUBLIC_PROJECT_KEY.test(options.apiKey)
    && acceptedApiHost(options.apiHost) !== null
    && classifyPublicAnalyticsRoute(evidence.href) !== null,
  );
}

export function createPostHogBeforeSend(
  resolveHref: () => string,
): (capture: CaptureResult | null) => CaptureResult | null {
  return (capture) => {
    if (
      capture?.event !== "$pageview"
      || capture.properties.distinct_id !== POSTHOG_COOKILESS_DISTINCT_ID
      || capture.properties.$cookieless_mode !== true
      || typeof capture.properties.token !== "string"
      || !PUBLIC_PROJECT_KEY.test(capture.properties.token)
    ) {
      return null;
    }

    const route = classifyPublicAnalyticsRoute(resolveHref());
    if (route === null) return null;

    return {
      event: "$pageview",
      properties: {
        $cookieless_mode: true,
        $current_url: canonicalAnalyticsUrl(route),
        $host: route.canonical_domain,
        $pathname: route.canonical_path,
        $process_person_profile: false,
        distinct_id: POSTHOG_COOKILESS_DISTINCT_ID,
        token: capture.properties.token,
        ...route,
      },
      uuid: capture.uuid,
      ...(capture.timestamp === undefined ? {} : { timestamp: capture.timestamp }),
    };
  };
}

export function createPostHogConfig(
  resolveHref: () => string,
  apiHost: string = POSTHOG_API_HOST,
): Partial<PostHogConfig> {
  return {
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    advanced_disable_flags: true,
    api_host: apiHost,
    autocapture: false,
    before_send: createPostHogBeforeSend(resolveHref),
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_pageleave: false,
    capture_pageview: "history_change",
    capture_performance: false,
    cookieless_mode: "always",
    cross_subdomain_cookie: false,
    disable_capture_url_hashes: true,
    disable_conversations: true,
    disable_product_tours: true,
    disable_session_recording: true,
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    enable_recording_console_log: false,
    mask_all_element_attributes: true,
    mask_all_text: true,
    mask_personal_data_properties: true,
    person_profiles: "never",
    persistence: "memory",
    rageclick: false,
    respect_dnt: true,
    save_campaign_params: false,
    save_referrer: false,
  };
}

export async function initializePostHog(
  options: PostHogInitializationOptions,
): Promise<boolean> {
  if (initialization !== null) return initialization;
  if (!isPostHogEligible(options)) return false;

  const apiHost = acceptedApiHost(options.apiHost);
  const apiKey = options.apiKey;
  if (apiHost === null || apiKey === undefined || typeof window === "undefined") {
    return false;
  }

  initialization = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(apiKey, createPostHogConfig(() => window.location.href, apiHost));
      return true;
    })
    .catch(() => {
      initialization = null;
      return false;
    });
  return initialization;
}
