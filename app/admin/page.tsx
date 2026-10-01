import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { indiaDateKey, indiaDateOnly, INDIA_TIMEZONE } from "@/lib/time";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatMinutes(value: number) {
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export default async function AdminDashboardPage() {
  const today = indiaDateOnly();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const trendStart = new Date(today);
  trendStart.setUTCDate(trendStart.getUTCDate() - 6);

  const [totalWorkers, activeWorkers, activeSites, todayAttendance, recentAttendance, trendAttendance, sites, activeWorkersWithSite] = await Promise.all([
    prisma.worker.count(),
    prisma.worker.count({ where: { isActive: true } }),
    prisma.site.count({ where: { isActive: true } }),
    prisma.attendance.findMany({
      where: { attendanceDate: today, worker: { isActive: true } },
      select: { workerId: true, siteId: true, checkOutTime: true, totalWorkingMinutes: true, status: true },
    }),
    prisma.attendance.findMany({
      orderBy: { checkInTime: "desc" },
      take: 6,
      select: { id: true, attendanceDate: true, checkInTime: true, checkOutTime: true, totalWorkingMinutes: true, status: true, distanceFromSiteMeters: true, worker: { select: { fullName: true, workerId: true } }, site: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      where: { attendanceDate: { gte: trendStart, lt: tomorrow } },
      select: { attendanceDate: true, status: true, totalWorkingMinutes: true },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
    prisma.worker.findMany({ where: { isActive: true, selectedSiteId: { not: null } }, select: { selectedSiteId: true } }),
  ]);

  const presentStatuses = new Set(["PRESENT", "IN_PROGRESS", "COMPLETED"]);
  const workersWithAttendance = new Set(todayAttendance.map((record) => record.workerId));
  const presentWorkers = new Set(todayAttendance.filter((record) => presentStatuses.has(record.status)).map((record) => record.workerId));
  const presentToday = presentWorkers.size;
  const absentToday = Math.max(activeWorkers - workersWithAttendance.size, 0);
  const checkedInToday = todayAttendance.filter((record) => !record.checkOutTime && (record.status === "PRESENT" || record.status === "IN_PROGRESS")).length;
  const checkedOutToday = todayAttendance.filter((record) => record.checkOutTime !== null).length;
  const outsideToday = todayAttendance.filter((record) => record.status === "OUTSIDE_SITE").length;
  const completedMinutes = todayAttendance.reduce((sum, record) => sum + (record.checkOutTime ? record.totalWorkingMinutes ?? 0 : 0), 0);
  const selectedWorkersBySite = new Map<string, number>();
  for (const worker of activeWorkersWithSite) {
    if (worker.selectedSiteId) selectedWorkersBySite.set(worker.selectedSiteId, (selectedWorkersBySite.get(worker.selectedSiteId) ?? 0) + 1);
  }
  const attendanceBySite = new Map<string, number>();
  for (const record of todayAttendance) {
    attendanceBySite.set(record.siteId, (attendanceBySite.get(record.siteId) ?? 0) + 1);
  }
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(trendStart);
    date.setUTCDate(date.getUTCDate() + index);
    const key = indiaDateKey(date);
    const records = trendAttendance.filter((record) => indiaDateKey(record.attendanceDate) === key);
    return { key, label: date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }), count: records.length, minutes: records.reduce((sum, record) => sum + (record.totalWorkingMinutes ?? 0), 0) };
  });
  const maxTrend = Math.max(...trend.map((day) => day.count), 1);
  const metrics = [
    ["Total workers", totalWorkers, "All worker accounts", "metric-blue"],
    ["Active workers", activeWorkers, "Enabled accounts", "metric-neutral"],
    ["Active sites", activeSites, "Available for selection", "metric-blue"],
    ["Present today", presentToday, "Verified within site", "metric-green"],
    ["Absent today", absentToday, "Active workers without attendance", "metric-amber"],
    ["Checked in", checkedInToday, "Currently in progress", "metric-green"],
    ["Checked out", checkedOutToday, "Completed attendance", "metric-neutral"],
    ["Outside site", outsideToday, "Needs review", "metric-red"],
    ["Total hours today", formatMinutes(completedMinutes), "Completed check-outs", "metric-blue"],
  ] as const;

  return <AdminShell title="Dashboard">
    <div className="page-heading"><div><div className="eyebrow">Operations overview</div><h1>Attendance overview</h1><p>Daily workforce status across configured sites.</p></div><div className="date-pill">{today.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}</div></div>
    <section className="metrics">{metrics.map(([label, value, description, className]) => <div className={`panel metric ${className}`} key={label}><div className="metric-topline"><div className="metric-icon">{label.slice(0, 1)}</div><div className="metric-label">{label}</div></div><div className="metric-value">{value}</div><div className="metric-description">{description}</div></div>)}</section>
    <section className="dashboard-grid">
      <div className="panel dashboard-main-panel"><div className="panel-header"><div><h2 className="panel-title">Recent attendance</h2><span className="panel-note">Latest check-in activity</span></div><Link className="text-link" href="/admin/attendance">View all</Link></div>{recentAttendance.length === 0 ? <EmptyState title="No attendance activity" message="Attendance records will appear here after workers check in." /> : <div className="table-wrap"><table><thead><tr><th>Worker</th><th>Site</th><th>Check-in</th><th>Check-out</th><th>Hours</th><th>Status</th><th>Distance</th></tr></thead><tbody>{recentAttendance.map((record) => <tr key={record.id}><td><strong>{record.worker.fullName}</strong><span className="table-subtext">{record.worker.workerId}</span></td><td>{record.site.name}</td><td>{record.checkInTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: INDIA_TIMEZONE })}</td><td>{record.checkOutTime?.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: INDIA_TIMEZONE }) ?? "—"}</td><td>{record.totalWorkingMinutes === null ? "In Progress" : formatMinutes(record.totalWorkingMinutes)}</td><td><span className={`status ${record.status === "COMPLETED" ? "status-present" : record.status === "IN_PROGRESS" ? "status-late" : "status-outside"}`}>{record.status}</span></td><td>{Math.round(Number(record.distanceFromSiteMeters))} m</td></tr>)}</tbody></table></div>}</div>
      <div className="panel trend-panel"><div className="panel-header"><div><h2 className="panel-title">Attendance trend</h2><span className="panel-note">Last seven days</span></div></div>{trendAttendance.length === 0 ? <EmptyState title="No data yet" message="Attendance trend will be visible after workers start checking in." /> : <div className="trend-chart">{trend.map((day) => <div className="trend-column" key={day.key}><div className="trend-bar-track"><div className="trend-bar" style={{ height: `${Math.max((day.count / maxTrend) * 100, day.count ? 12 : 3)}%` }} /></div><strong>{day.count}</strong><span>{day.label}</span><small>{formatMinutes(day.minutes)}</small></div>)}</div>}</div>
    </section>
    <section className="panel">
      <div className="panel-header"><div><h2 className="panel-title">Site summary</h2><span className="panel-note">Current selections and today&apos;s attendance</span></div><Link className="text-link" href="/admin/sites">Manage sites</Link></div>
      {sites.length === 0 ? <EmptyState title="No sites configured" message="Configured work sites will appear here." /> : <div className="table-wrap"><table><thead><tr><th>Site</th><th>Status</th><th>Workers selecting site</th><th>Today&apos;s attendance</th></tr></thead><tbody>{sites.map((site) => <tr key={site.id}><td>{site.name}</td><td><span className={`status ${site.isActive ? "status-present" : "status-absent"}`}>{site.isActive ? "Active" : "Inactive"}</span></td><td>{selectedWorkersBySite.get(site.id) ?? 0}</td><td>{attendanceBySite.get(site.id) ?? 0}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel quick-actions"><div className="panel-header"><div><h2 className="panel-title">Quick actions</h2><span className="panel-note">Move through common workflows</span></div></div><div className="action-grid"><Link href="/admin/sites" className="action-link"><span className="action-icon">+</span><span><strong>Add site</strong><small>Configure a work location</small></span></Link><Link href="/admin/attendance" className="action-link"><span className="action-icon">A</span><span><strong>View attendance</strong><small>Review check-in records</small></span></Link><Link href="/admin/reports" className="action-link"><span className="action-icon">R</span><span><strong>Generate report</strong><small>Open the report library</small></span></Link></div></section>
  </AdminShell>;
}
