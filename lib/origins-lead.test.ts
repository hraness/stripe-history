import { describe, expect, test } from "bun:test";

import { loadHistory } from "./content";
import { plainText } from "./linked-text";
import { deriveOriginsLead, ORIGINS_LEAD_EVENT_IDS } from "./origins-lead";

describe("origins lead", () => {
  test("states the founding answer from records at record precision", async () => {
    const lead = deriveOriginsLead((await loadHistory()).events);
    expect(plainText(lead)).toBe(
      "Patrick and John Collison built Stripe’s first working prototype in Buenos Aires in January 2010. John took leave from Harvard to work on it full time that fall. The product, first called /dev/payments, became Stripe in January 2011 and launched publicly on September 30, 2011.",
    );
    expect(lead.flatMap(({ target }) => (target?.kind === "event" ? [target.eventId] : []))).toEqual([
      ORIGINS_LEAD_EVENT_IDS.prototype,
      ORIGINS_LEAD_EVENT_IDS.fullTime,
      ORIGINS_LEAD_EVENT_IDS.rename,
      ORIGINS_LEAD_EVENT_IDS.launch,
    ]);
  });

  test("fails when any cited record disappears", async () => {
    const events = (await loadHistory()).events;
    for (const id of Object.values(ORIGINS_LEAD_EVENT_IDS)) {
      expect(() => deriveOriginsLead(events.filter((event) => event.id !== id))).toThrow(id);
    }
  });

  test("follows a change in launch-date precision", async () => {
    const events = (await loadHistory()).events.map((event) => (
      event.id === ORIGINS_LEAD_EVENT_IDS.launch
        ? { ...event, date: "2011-09", date_precision: "month" as const }
        : event
    ));
    expect(plainText(deriveOriginsLead(events))).toEndWith("launched publicly in September 2011.");
  });
});
