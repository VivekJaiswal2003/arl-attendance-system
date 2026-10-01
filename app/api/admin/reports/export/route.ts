import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildReportWhere, normalizeReportFilters } from "@/lib/attendance-report";
import { prisma } from "@/lib/prisma";
import { INDIA_TIMEZONE, indiaDateKey, indiaMonthRange } from "@/lib/time";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null) {
  let text = value === null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function formatMinutes(minutes: number | null, checkOutTime: Date | null, status: string) {
  if (!checkOutTime || status !== "COMPLETED" || minutes === null) return "";
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const filters = normalizeReportFilters({
    month: params.get("month"),
    worker: params.get("worker"),
    site: params.get("site"),
    status: params.get("status"),
  });
  const { start, end } = indiaMonthRange(filters.month);
  const records = await prisma.attendance.findMany({
    where: buildReportWhere(start, end, filters),
    orderBy: [{ attendanceDate: "asc" }, { checkInTime: "asc" }],
    select: {
      attendanceDate: true,
      checkInTime: true,
      checkOutTime: true,
      totalWorkingMinutes: true,
      status: true,
      worker: { select: { fullName: true, workerId: true, currentJobTitle: true } },
      site: { select: { name: true } },
    },
  });

  const rows = [
    ["Worker", "Worker ID", "Current role", "Date", "Site", "Check-in (IST)", "Check-out (IST)", "Status", "Working time"],
    ...records.map((record) => [
      record.worker.fullName,
      record.worker.workerId,
      record.worker.currentJobTitle ?? "",
      indiaDateKey(record.attendanceDate),
      record.site.name,
      record.checkInTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: INDIA_TIMEZONE }),
      record.checkOutTime?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: INDIA_TIMEZONE }) ?? "",
      record.status,
      formatMinutes(record.totalWorkingMinutes, record.checkOutTime, record.status),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${filters.month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}