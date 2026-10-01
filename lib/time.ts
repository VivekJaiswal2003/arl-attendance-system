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
  return new Date(Date.UTC(year, month - 1, day));
}

export function indiaDateKey(date = new Date()): string {
  const { year, month, day } = getIndiaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function indiaDateFromKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function indiaMonthRange(monthKey: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    throw new Error("Month must use YYYY-MM format.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 01 and 12.");
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(nextYear, nextMonth - 1, 1)),
  };
}
