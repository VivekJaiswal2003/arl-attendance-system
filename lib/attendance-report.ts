import type { Prisma } from "@prisma/client";
import { indiaDateKey } from "@/lib/time";

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

export function buildReportWhere(start: Date, end: Date, filters: ReportFilters): Prisma.AttendanceWhereInput {
  return {
    attendanceDate: { gte: start, lt: end },
    ...(filters.worker ? { workerId: filters.worker } : {}),
    ...(filters.site ? { siteId: filters.site } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}