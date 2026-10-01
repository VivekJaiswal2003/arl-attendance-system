import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { indiaDateFromKey } from "@/lib/time";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatMinutes(value: number | null) {
  return value === null ? "In Progress" : `${Math.floor(value / 60)}h ${value % 60}m`;
}

export default async function AttendancePage({ searchParams }: { searchParams?: Promise<{ date?: string; worker?: string; site?: string; status?: string }> }) {
  const filters = searchParams ? await searchParams : {};
  const date = filters.date ? indiaDateFromKey(filters.date) : null;
  const nextDate = date ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : null;
  const allowedStatuses = ["PRESENT", "OUTSIDE_SITE", "IN_PROGRESS", "COMPLETED"] as const;
  const status = allowedStatuses.find((value) => value === filters.status);
  const [records, sites] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        ...(date && nextDate ? { attendanceDate: { gte: date, lt: nextDate } } : {}),
        ...(filters.site && filters.site !== "all" ? { siteId: filters.site } : {}),
        ...(status ? { status } : {}),
        ...(filters.worker ? { worker: { OR: [{ fullName: { contains: filters.worker, mode: "insensitive" } }, { workerId: { contains: filters.worker, mode: "insensitive" } }] } } : {}),
      },
      orderBy: { checkInTime: "desc" },
      take: 100,
      select: { id: true, attendanceDate: true, checkInTime: true, checkOutTime: true, totalWorkingMinutes: true, distanceFromSiteMeters: true, status: true, worker: { select: { workerId: true, fullName: true } }, site: { select: { name: true } } },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return <AdminShell title="Attendance">
    <div className="page-heading"><div><div className="eyebrow">Operations</div><h1>Attendance records</h1><p>Review daily check-ins, exceptions, and site verification.</p></div><span className="date-pill">{records.length} records</span></div>
    <section className="panel"><form className="toolbar" method="get"><input className="field" type="date" name="date" defaultValue={filters.date ?? ""} aria-label="Attendance date" /><input className="field" name="worker" defaultValue={filters.worker ?? ""} placeholder="Worker name or ID" aria-label="Filter worker" /><select className="field" name="status" defaultValue={filters.status ?? "all"} aria-label="Filter attendance status"><option value="all">All statuses</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="PRESENT">Present</option><option value="OUTSIDE_SITE">Outside site</option></select><select className="field" name="site" defaultValue={filters.site ?? "all"} aria-label="Filter attendance site"><option value="all">All sites</option>{sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select><button className="button-primary small-button" type="submit">Apply</button></form><div className="table-wrap"><table><thead><tr><th>Worker</th><th>Employee ID</th><th>Date</th><th>Site</th><th>Check-in</th><th>Check-out</th><th>Working hours</th><th>Distance</th><th>Status</th><th>Actions</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={10}><EmptyState title="No attendance records" message="Attendance records will appear here after workers check in." /></td></tr> : records.map((record) => <tr key={record.id}><td><strong>{record.worker.fullName}</strong></td><td>{record.worker.workerId}</td><td>{record.attendanceDate.toLocaleDateString("en-US")}</td><td>{record.site.name}</td><td>{record.checkInTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td><td>{record.checkOutTime?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) ?? "—"}</td><td>{formatMinutes(record.totalWorkingMinutes)}</td><td>{Math.round(Number(record.distanceFromSiteMeters))} m</td><td><span className={`status ${record.status === "COMPLETED" ? "status-present" : record.status === "IN_PROGRESS" ? "status-late" : "status-outside"}`}>{record.status}</span></td><td><Link className="text-link" href={`/admin/attendance/${record.id}`}>View</Link></td></tr>)}</tbody></table></div></section>
  </AdminShell>;
}
