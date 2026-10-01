// Child-process harness for the analytics contract test. It loads the pinned
// posthog-js under a minimal browser shape, initializes it with the site's
// production config (including its real before_send), captures events, and
// prints what before_send received and returned plus the request bodies
// posthog-js handed to fetch. It runs in its own process so the browser
// globals never leak into the test runner. Modeled on the hraness/slopcamera
// harness and `@hraness/posthog/testing`.
import type { CaptureResult } from "posthog-js";

import type { PostHogSiteDefinition } from "@hraness/posthog/site";

export type HarnessCapture = Readonly<{
  event: string;
  properties?: Record<string, unknown>;
  /** Captured through `posthog.captureException` instead of `posthog.capture`. */
  error?: Readonly<{ name?: string; message: string; stack?: string }>;
  /** Uses the site's page-not-found builder for the scenario URL and referrer. */
  pageNotFound?: true;
  /** Uses the site's budgeted exception builder with this origin. */
  exceptionOrigin?: "window_error" | "unhandled_rejection" | "react_error_boundary";
}>;

export type HarnessScenario = Readonly<{
  href: string;
  referrer?: string;
  title?: string;
  captures: readonly HarnessCapture[];
}>;

export type HarnessInput = Readonly<{
  site?: PostHogSiteDefinition;
  apiKey: string;
  userAgent: string;
  scenarios: readonly HarnessScenario[];
}>;

const chunks: Uint8Array[] = [];
for await (const chunk of process.stdin) {
  chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk as Uint8Array);
}
const input = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) as HarnessInput;

const listeners = { addEventListener() {}, removeEventListener() {} };
const firstScenario = input.scenarios[0];
if (!firstScenario) throw new Error("harness needs at least one scenario");
const pageLocation = new URL(firstScenario.href);
const pageDocument = {
  ...listeners,
  body: null,
  cookie: "",
  // posthog-js parses URLs (for $referring_domain and $host) through an anchor.
  createElement: () => {
    const element: Record<string, unknown> = { ...listeners, setAttribute() {}, style: {} };
    Object.defineProperty(element, "href", {
      get: () => element["_href"],
      set: (value: string) => {
        element["_href"] = value;
        try {
          const url = new URL(value, pageLocation.href);
          Object.assign(element, {
            hash: url.hash,
            host: url.host,
            hostname: url.hostname,
            pathname: url.pathname,
            port: url.port,
            protocol: url.protocol,
            search: url.search,
          });
        } catch {
          // Leave the anchor without parsed parts, as a browser would for junk.
        }
      },
    });
    return element;
  },
  documentElement: {},
  getElementsByTagName: () => [],
  location: pageLocation,
  URL: pageLocation.href,
  querySelector: () => null,
  querySelectorAll: () => [],
  readyState: "complete",
  referrer: firstScenario.referrer ?? "",
  title: firstScenario.title ?? "",
  visibilityState: "visible",
};
const sent: string[] = [];
Object.assign(globalThis, {
  document: pageDocument,
  location: pageLocation,
  navigator: {
    doNotTrack: null,
    language: "en-US",
    languages: ["en-US"],
    onLine: true,
    userAgent: input.userAgent,
    webdriver: false,
  },
  screen: { height: 900, width: 1440 },
  window: globalThis,
  innerHeight: 900,
  innerWidth: 1440,
  ...listeners,
  fetch: async (_url: string, init: { body?: unknown } = {}) => {
    const body = init.body;
    const bytes = typeof body === "string"
      ? new TextEncoder().encode(body)
      : body instanceof Blob
        ? new Uint8Array(await body.arrayBuffer())
        : body instanceof ArrayBuffer
          ? new Uint8Array(body)
          : body instanceof Uint8Array
            ? body
            : new Uint8Array();
    sent.push(Buffer.from(bytes).toString("base64"));
    return new Response('{"status":1}', { status: 200 });
  },
});

// posthog-js reads browser globals when it loads, so it loads only after the
// page shape above exists.
const { posthog } = await import("posthog-js");
const { analyticsSite } = await import("../app/analytics");
const { analyticsExceptionCapture, createPostHogConfig } = await import("../app/posthog");
const { pageNotFoundProperties } = await import("@hraness/posthog/event");

const received: unknown[] = [];
const returned: unknown[] = [];
const evidence = { href: firstScenario.href, referrer: firstScenario.referrer ?? "" };
const config = createPostHogConfig(() => evidence, undefined, input.site ?? analyticsSite, () => true);
const productionBeforeSend = config.before_send;
if (typeof productionBeforeSend !== "function") {
  throw new Error("production config has no before_send function");
}
posthog.init(input.apiKey, {
  ...config,
  // Explicit captures only; everything else is the production config.
  capture_pageview: false,
  capture_pageleave: false,
  capture_performance: false,
  before_send: (event: CaptureResult | null) => {
    received.push(structuredClone(event));
    const result = productionBeforeSend(event);
    returned.push(structuredClone(result));
    return result;
  },
});

async function drain(expected: number): Promise<void> {
  for (const deadline = Date.now() + 5_000; sent.length < expected && Date.now() < deadline;) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
}

for (const scenario of input.scenarios) {
  const next = new URL(scenario.href);
  pageLocation.href = next.href;
  pageDocument.URL = next.href;
  pageDocument.referrer = scenario.referrer ?? "";
  pageDocument.title = scenario.title ?? "";
  evidence.href = scenario.href;
  evidence.referrer = scenario.referrer ?? "";
  for (const capture of scenario.captures) {
    const before = returned.length;
    if (capture.error) {
      const error = new Error(capture.error.message);
      error.name = capture.error.name ?? "Error";
      if (capture.error.stack) error.stack = capture.error.stack;
      if (capture.exceptionOrigin) {
        const exception = analyticsExceptionCapture(error, capture.exceptionOrigin);
        if (exception) posthog.captureException(exception.error, exception.properties);
      } else {
        posthog.captureException(error, capture.properties ?? {});
      }
    } else {
      const properties = capture.pageNotFound
        ? pageNotFoundProperties({ requestedPath: next.pathname, referrer: scenario.referrer ?? "" })
        : capture.properties;
      posthog.capture(capture.event, { ...properties }, {
        send_instantly: true,
        transport: "fetch",
      });
    }
    const accepted = returned.slice(before).filter((value) => value !== null).length;
    await drain(sent.length + accepted);
  }
}

process.stdout.write(JSON.stringify({ sent, received, returned }));
process.exit(0);
