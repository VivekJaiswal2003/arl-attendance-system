import type { Prisma } from "@prisma/client";
import { indiaDateKey } from "./time.ts";

export const REPORT_STATUSES = ["PRESENT", "IN_PROGRESS", "COMPLETED", "OUTSIDE_SITE"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportFilters = {
  month: string;
  worker?: string;
  site?: string;
  status?: ReportStatus;
};

export function normalizeReportFilters(params: {
  month?: string | null;
  worker?: string | null;
  site?: string | null;
  status?: string | null;
}): ReportFilters {
  const requestedMonth = params.month ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth
    : indiaDateKey().slice(0, 7);
  const worker = params.worker?.trim();
  const site = params.site?.trim();
  const status = REPORT_STATUSES.find((candidate) => candidate === params.status);

  return {
    month,
    ...(worker && worker !== "all" ? { worker } : {}),
    ...(site && site !== "all" ? { site } : {}),
    ...(status ? { status } : {}),
  };
}

// `attendanceDate` is a DATE column that Prisma stores as the UTC date of IST
// midnight (one day early), so the report filters on the real check-in instant
// within the India-local month instead.
export function buildReportWhere(start: Date, end: Date, filters: ReportFilters): Prisma.AttendanceWhereInput {
  return {
    checkInTime: { gte: start, lt: end },
    ...(filters.worker ? { workerId: filters.worker } : {}),
    ...(filters.site ? { siteId: filters.site } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}