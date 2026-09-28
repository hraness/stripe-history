const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type EventDatePrecision = "day" | "month" | "year";

interface ParsedEventDate {
  readonly day?: number;
  readonly month?: (typeof monthNames)[number];
  readonly precision: EventDatePrecision;
  readonly year: number;
}

function parseEventDate(value: string): ParsedEventDate {
  const match = /^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/u.exec(value);
  if (match === null) throw new Error(`Invalid event date ${JSON.stringify(value)}`);
  const year = Number(match[1]);
  if (match[2] === undefined) return { precision: "year", year };
  const month = monthNames[Number(match[2]) - 1];
  if (month === undefined) throw new Error(`Invalid event month in ${value}`);
  if (match[3] === undefined) return { month, precision: "month", year };
  return { day: Number(match[3]), month, precision: "day", year };
}

/** Renders a record date at exactly the precision the record carries. */
export function formatEventDate(value: string): string {
  const date = parseEventDate(value);
  if (date.month === undefined) return String(date.year);
  if (date.day === undefined) return `${date.month} ${date.year}`;
  return `${date.month} ${date.day}, ${date.year}`;
}

/** "on September 30, 2011" for a day; "in January 2010" or "in 2022" otherwise. */
export function eventDatePhrase(value: string): string {
  return `${parseEventDate(value).precision === "day" ? "on" : "in"} ${formatEventDate(value)}`;
}

export function eventYear(value: string): number {
  return parseEventDate(value).year;
}
