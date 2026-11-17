import messaging from "./product-messaging.json";

if (messaging.formatVersion !== 1 || messaging.product !== "stripe-history") {
  throw new Error("The website needs its Stripe History product copy.");
}

/** Repository-owned product copy: names, descriptions, hero, and section headings. */
export const productMessaging = messaging;
export const productHeadings = productMessaging.headings;
