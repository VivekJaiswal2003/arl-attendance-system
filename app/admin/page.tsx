import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";
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

  const [totalWorkers, presentToday, outsideToday, recentAttendance, trendAttendance, completedToday] = await Promise.all([
    prisma.worker.count({ where: { isActive: true } }),
    prisma.attendance.count({ where: { attendanceDate: today, status: { in: ["PRESENT", "IN_PROGRESS", "COMPLETED"] } } }),
    prisma.attendance.count({ where: { attendanceDate: today, status: "OUTSIDE_SITE" } }),
    prisma.attendance.findMany({
      orderBy: { checkInTime: "desc" },
      take: 6,
      select: { id: true, attendanceDate: true, checkInTime: true, checkOutTime: true, totalWorkingMinutes: true, status: true, distanceFromSiteMeters: true, worker: { select: { fullName: true, workerId: true } }, site: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      where: { attendanceDate: { gte: trendStart, lt: tomorrow } },
      select: { attendanceDate: true, status: true, totalWorkingMinutes: true },
    }),
    prisma.attendance.findMany({ where: { attendanceDate: today, status: "COMPLETED" }, select: { totalWorkingMinutes: true } }),
  ]);

  const todayRecords = presentToday + outsideToday;
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(trendStart);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const records = trendAttendance.filter((record) => record.attendanceDate.toISOString().slice(0, 10) === key);
    return { key, label: date.toLocaleDateString("en-US", { weekday: "short" }), count: records.length, minutes: records.reduce((sum, record) => sum + (record.totalWorkingMinutes ?? 0), 0) };
  });
  const maxTrend = Math.max(...trend.map((day) => day.count), 1);
  const metrics = [
    ["Total workers", totalWorkers, "Active workforce", "metric-blue"],
    ["Present today", presentToday, "Verified within site", "metric-green"],
    ["Absent today", Math.max(totalWorkers - todayRecords, 0), "No check-in recorded", "metric-amber"],
    ["Outside site", outsideToday, "Needs review", "metric-red"],
    ["Late", 0, "No threshold configured", "metric-neutral"],
    ["Total hours today", formatMinutes(completedToday.reduce((sum, record) => sum + (record.totalWorkingMinutes ?? 0), 0)), "Completed check-outs", "metric-blue"],
  ] as const;

  return <AdminShell title="Dashboard">
    <div className="page-heading"><div><div className="eyebrow">Operations overview</div><h1>Attendance overview</h1><p>Daily workforce status across configured sites.</p></div><div className="date-pill">{today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div></div>
    <section className="metrics">{metrics.map(([label, value, description, className]) => <div className={`panel metric ${className}`} key={label}><div className="metric-topline"><div className="metric-icon">{label.slice(0, 1)}</div><div className="metric-label">{label}</div></div><div className="metric-value">{value}</div><div className="metric-description">{description}</div></div>)}</section>
    <section className="dashboard-grid">
      <div className="panel dashboard-main-panel"><div className="panel-header"><div><h2 className="panel-title">Recent attendance</h2><span className="panel-note">Latest check-in activity</span></div><Link className="text-link" href="/admin/attendance">View all</Link></div>{recentAttendance.length === 0 ? <EmptyState title="No attendance activity" message="Attendance records will appear here after workers check in." /> : <div className="table-wrap"><table><thead><tr><th>Worker</th><th>Site</th><th>Check-in</th><th>Check-out</th><th>Hours</th><th>Status</th><th>Distance</th></tr></thead><tbody>{recentAttendance.map((record) => <tr key={record.id}><td><strong>{record.worker.fullName}</strong><span className="table-subtext">{record.worker.workerId}</span></td><td>{record.site.name}</td><td>{record.checkInTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td><td>{record.checkOutTime?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) ?? "—"}</td><td>{record.totalWorkingMinutes === null ? "In Progress" : formatMinutes(record.totalWorkingMinutes)}</td><td><span className={`status ${record.status === "COMPLETED" ? "status-present" : record.status === "IN_PROGRESS" ? "status-late" : "status-outside"}`}>{record.status}</span></td><td>{Math.round(Number(record.distanceFromSiteMeters))} m</td></tr>)}</tbody></table></div>}</div>
      <div className="panel trend-panel"><div className="panel-header"><div><h2 className="panel-title">Attendance trend</h2><span className="panel-note">Last seven days</span></div></div>{trendAttendance.length === 0 ? <EmptyState title="No data yet" message="Attendance trend will be visible after workers start checking in." /> : <div className="trend-chart">{trend.map((day) => <div className="trend-column" key={day.key}><div className="trend-bar-track"><div className="trend-bar" style={{ height: `${Math.max((day.count / maxTrend) * 100, day.count ? 12 : 3)}%` }} /></div><strong>{day.count}</strong><span>{day.label}</span><small>{formatMinutes(day.minutes)}</small></div>)}</div>}</div>
    </section>
    <section className="panel quick-actions"><div className="panel-header"><div><h2 className="panel-title">Quick actions</h2><span className="panel-note">Move through common workflows</span></div></div><div className="action-grid"><Link href="/admin/sites" className="action-link"><span className="action-icon">+</span><span><strong>Add site</strong><small>Configure a work location</small></span></Link><Link href="/admin/attendance" className="action-link"><span className="action-icon">A</span><span><strong>View attendance</strong><small>Review check-in records</small></span></Link><Link href="/admin/reports" className="action-link"><span className="action-icon">R</span><span><strong>Generate report</strong><small>Open the report library</small></span></Link></div></section>
  </AdminShell>;
}
