import snapshot from "../portfolio-messaging.generated.json";

if (snapshot.contract !== "hraness.product-messaging/v1" || snapshot.productId !== "stripe-history" || snapshot.canonicalUrl !== "https://hraness.com/stripe") {
  throw new Error("The website needs its canonical Stripe History messaging snapshot.");
}

/** Pinned at refresh time; importing this module never fetches or rewrites copy. */
export const productMessaging = snapshot.messaging;
export const productHeadings = productMessaging.headings;
