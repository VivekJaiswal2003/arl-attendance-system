export const INDIA_TIMEZONE = "Asia/Kolkata";

function getIndiaDateParts(date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const record = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    year: Number(record.year),
    month: Number(record.month),
    day: Number(record.day),
  };
}

export function indiaDateOnly(date = new Date()): Date {
  const { year, month, day } = getIndiaDateParts(date);
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`);
}

export function indiaDateKey(date = new Date()): string {
  const { year, month, day } = getIndiaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parses a "YYYY-MM-DD" date key into a Date representing midnight of that
 * day in the India timezone. Returns null when the key is missing or not a
 * valid calendar date.
 */
export function indiaDateFromKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(`${yearText}-${monthText}-${dayText}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return null;

  // Reject values like "2024-02-31" that `Date` would otherwise silently roll forward.
  const parts = getIndiaDateParts(date);
  if (parts.year !== year || parts.month !== month || parts.day !== day) return null;

  return date;
}

/**
 * Computes the [start, end) range covering a whole calendar month in the
 * India timezone, for a "YYYY-MM" month key. `end` is the first instant of
 * the following month, so the range can be used directly in an exclusive
 * upper-bound (`lt`) query filter.
 */
export function indiaMonthRange(month: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  const [yearText, monthText] = match ? [match[1], match[2]] : indiaDateKey().slice(0, 7).split("-");

  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1; // 0-based
  const nextMonthIndex = monthIndex + 1;
  const nextYear = year + Math.floor(nextMonthIndex / 12);
  const normalizedNextMonth = ((nextMonthIndex % 12) + 12) % 12;

  const start = new Date(`${yearText}-${monthText}-01T00:00:00+05:30`);
  const end = new Date(`${nextYear}-${String(normalizedNextMonth + 1).padStart(2, "0")}-01T00:00:00+05:30`);

  return { start, end };
}
