/** Response headers sent with every page and asset. The site loads only its own files and contacts the analytics host and Hraness Accounts. */
const ANALYTICS_ORIGIN = "https://us.i.posthog.com";
/** The shared footer checks consent region and posts the newsletter form here. */
const ACCOUNTS_ORIGIN = "https://account.hraness.com";

export const CONTENT_SECURITY_POLICY: string = [
  "default-src 'self'",
  // Next inlines its page payload and the theme bootstrap is a same-origin file.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${ANALYTICS_ORIGIN} ${ACCOUNTS_ORIGIN}`,
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${ACCOUNTS_ORIGIN} https://hraness.com`,
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS: ReadonlyArray<Readonly<{ key: string; value: string }>> = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
];
