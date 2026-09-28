import { describe, expect, test } from "bun:test";

import { eventDatePhrase, eventYear, formatEventDate } from "./event-date";

describe("event date formatting", () => {
  test("renders each date at the precision the record carries", () => {
    expect(formatEventDate("2022")).toBe("2022");
    expect(formatEventDate("2010-01")).toBe("January 2010");
    expect(formatEventDate("2011-09-30")).toBe("September 30, 2011");
    expect(formatEventDate("2013-03-01")).toBe("March 1, 2013");
    expect(eventDatePhrase("2011-09-30")).toBe("on September 30, 2011");
    expect(eventDatePhrase("2010-01")).toBe("in January 2010");
    expect(eventDatePhrase("2022")).toBe("in 2022");
  });

  test("never adds precision and always keeps the year", () => {
    for (let month = 1; month <= 12; month += 1) {
      const monthValue = `2019-${String(month).padStart(2, "0")}`;
      const monthLabel = formatEventDate(monthValue);
      expect(monthLabel).toMatch(/^[A-Z][a-z]+ 2019$/u);
      for (const day of [1, 9, 10, 28]) {
        const dayValue = `${monthValue}-${String(day).padStart(2, "0")}`;
        expect(formatEventDate(dayValue)).toBe(`${monthLabel.replace(" 2019", "")} ${day}, 2019`);
        expect(eventYear(dayValue)).toBe(2019);
      }
    }
  });

  test("rejects malformed dates", () => {
    for (const value of ["", "10", "2010-13", "2010-1", "2010-01-32", "2010/01/01"]) {
      expect(() => formatEventDate(value)).toThrow();
    }
  });
});
