import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INDIA_TIMEZONE } from "@/lib/time";

export const dynamic = "force-dynamic";

function formatMinutes(value: number | null) {
  return value === null ? "In Progress" : `${Math.floor(value / 60)}h ${value % 60}m`;
}

export default async function AttendanceDetailPage({ params }: { params: Promise<{ attendanceId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");
  const { attendanceId } = await params;
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: {
      attendanceDate: true,
      checkInTime: true,
      checkOutTime: true,
      totalWorkingMinutes: true,
      distanceFromSiteMeters: true,
      status: true,
      worker: { select: { fullName: true, workerId: true } },
      site: { select: { name: true, address: true } },
    },
  });
  if (!attendance) notFound();

  return <AdminShell title="Attendance detail"><div className="page-heading"><div><div className="eyebrow">Operations</div><h1>Attendance detail</h1><p>{attendance.worker.fullName} · {attendance.attendanceDate.toLocaleDateString("en-IN", { timeZone: "UTC" })}</p></div><Link href="/admin/attendance" className="button-secondary small-button">Back to attendance</Link></div><section className="panel"><div className="list"><div className="list-row"><span>Worker</span><strong>{attendance.worker.fullName} ({attendance.worker.workerId})</strong></div><div className="list-row"><span>Site</span><strong>{attendance.site.name} · {attendance.site.address}</strong></div><div className="list-row"><span>Check-in</span><strong>{attendance.checkInTime.toLocaleString("en-IN", { timeZone: INDIA_TIMEZONE })}</strong></div><div className="list-row"><span>Check-out</span><strong>{attendance.checkOutTime?.toLocaleString("en-IN", { timeZone: INDIA_TIMEZONE }) ?? "In Progress"}</strong></div><div className="list-row"><span>Working hours</span><strong>{formatMinutes(attendance.totalWorkingMinutes)}</strong></div><div className="list-row"><span>Distance</span><strong>{Math.round(Number(attendance.distanceFromSiteMeters))} meters</strong></div><div className="list-row"><span>Status</span><strong>{attendance.status}</strong></div></div></section></AdminShell>;
}
