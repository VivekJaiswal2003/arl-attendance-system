import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { buildReportWhere, normalizeReportFilters, REPORT_STATUSES } from "@/lib/attendance-report";
import { prisma } from "@/lib/prisma";
import { INDIA_TIMEZONE, indiaDateKey, indiaMonthRange } from "@/lib/time";

export const dynamic = "force-dynamic";

function formatMinutes(value: number) {
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ month?: string; worker?: string; site?: string; status?: string }> }) {
  const query = searchParams ? await searchParams : {};
  const filters = normalizeReportFilters(query);
  const { start, end } = indiaMonthRange(filters.month);
  const [records, workers, sites] = await Promise.all([
    prisma.attendance.findMany({
      where: buildReportWhere(start, end, filters),
      orderBy: [{ attendanceDate: "desc" }, { checkInTime: "desc" }],
      select: {
        id: true,
        attendanceDate: true,
        checkInTime: true,
        checkOutTime: true,
        totalWorkingMinutes: true,
        status: true,
        worker: { select: { fullName: true, workerId: true, currentJobTitle: true } },
        site: { select: { id: true, name: true } },
      },
    }),
    prisma.worker.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true, workerId: true } }),
    prisma.site.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const acceptedStatuses = new Set(["PRESENT", "IN_PROGRESS", "COMPLETED"]);
  const acceptedRecords = records.filter((record) => acceptedStatuses.has(record.status));
  const workingDays = new Set(acceptedRecords.map((record) => indiaDateKey(record.attendanceDate))).size;
  const presentDays = new Set(acceptedRecords.map((record) => indiaDateKey(record.attendanceDate))).size;
  const completedRecords = records.filter((record) => record.status === "COMPLETED" && record.checkOutTime !== null && record.totalWorkingMinutes !== null);
  const completedMinutes = completedRecords.reduce((sum, record) => sum + record.totalWorkingMinutes!, 0);
  const averageMinutes = completedRecords.length ? Math.round(completedMinutes / completedRecords.length) : null;

  const siteTotals = new Map<string, { records: number; presentDays: Set<string>; completedMinutes: number }>();
  for (const record of records) {
    let total = siteTotals.get(record.site.id);
    if (!total) {
      total = { records: 0, presentDays: new Set<string>(), completedMinutes: 0 };
      siteTotals.set(record.site.id, total);
    }
    total.records += 1;
    if (acceptedStatuses.has(record.status)) total.presentDays.add(indiaDateKey(record.attendanceDate));
    if (record.status === "COMPLETED" && record.checkOutTime && record.totalWorkingMinutes !== null) {
      total.completedMinutes += record.totalWorkingMinutes;
    }
  }

  const exportParams = new URLSearchParams({ month: filters.month });
  if (filters.worker) exportParams.set("worker", filters.worker);
  if (filters.site) exportParams.set("site", filters.site);
  if (filters.status) exportParams.set("status", filters.status);

  return <AdminShell title="Reports">
    <div className="page-heading"><div><div className="eyebrow">Reporting</div><h1>Monthly attendance report</h1><p>{records.length} records · {formatMinutes(completedMinutes)} completed</p></div></div>
    <section className="panel">
      <form className="toolbar" method="get">
        <input className="field" type="month" name="month" defaultValue={filters.month} aria-label="Report month" />
        <select className="field" name="worker" defaultValue={filters.worker ?? "all"} aria-label="Filter worker">
          <option value="all">All workers</option>
          {workers.map((worker) => <option value={worker.id} key={worker.id}>{worker.fullName} · {worker.workerId}</option>)}
        </select>
        <select className="field" name="site" defaultValue={filters.site ?? "all"} aria-label="Filter site">
          <option value="all">All sites</option>
          {sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}
        </select>
        <select className="field" name="status" defaultValue={filters.status ?? "all"} aria-label="Filter status">
          <option value="all">All statuses</option>
          {REPORT_STATUSES.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}
        </select>
        <button className="button-primary small-button" type="submit">Load report</button>
        <a className="button-secondary small-button" href={`/api/admin/reports/export?${exportParams.toString()}`}>Export CSV</a>
      </form>
      <section className="metrics">
        {[
          ["Working days", String(workingDays), "Distinct dates with accepted attendance", "metric-blue"],
          ["Present days", String(presentDays), "Distinct dates with accepted attendance", "metric-green"],
          ["Absent days", "Not tracked", "No schedule or absence records exist", "metric-neutral"],
          ["Completed hours", formatMinutes(completedMinutes), `${completedRecords.length} completed check-outs`, "metric-blue"],
          ["Average completed time", averageMinutes === null ? "—" : formatMinutes(averageMinutes), "Per completed attendance record", "metric-neutral"],
        ].map(([label, value, description, className]) => <div className={`panel metric ${className}`} key={label}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-description">{description}</div></div>)}
      </section>
      <div className="table-wrap"><table><thead><tr><th>Worker</th><th>Employee ID</th><th>Current role</th><th>Date</th><th>Site</th><th>Check-in</th><th>Check-out</th><th>Total working time</th><th>Status</th></tr></thead><tbody>
        {records.length === 0 ? <tr><td colSpan={9}><EmptyState title="No attendance records" message="No real attendance records match this report." /></td></tr> : records.map((record) => <tr key={record.id}><td>{record.worker.fullName}</td><td>{record.worker.workerId}</td><td>{record.worker.currentJobTitle ?? "—"}</td><td>{indiaDateKey(record.attendanceDate)}</td><td>{record.site.name}</td><td>{record.checkInTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: INDIA_TIMEZONE })}</td><td>{record.checkOutTime?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: INDIA_TIMEZONE }) ?? "—"}</td><td>{record.status === "COMPLETED" && record.checkOutTime && record.totalWorkingMinutes !== null ? formatMinutes(record.totalWorkingMinutes) : "In Progress"}</td><td>{record.status}</td></tr>)}
      </tbody></table></div>
    </section>
    <section className="panel" style={{ marginTop: 24 }}>
      <div className="panel-header"><div><h2 className="panel-title">Site summary</h2><span className="panel-note">Current report filters applied</span></div></div>
      {sites.length === 0 ? <EmptyState title="No sites configured" message="Site totals will appear when site records exist." /> : <div className="table-wrap"><table><thead><tr><th>Site</th><th>Attendance records</th><th>Present days</th><th>Completed working time</th></tr></thead><tbody>{sites.map((site) => {
        const total = siteTotals.get(site.id);
        return <tr key={site.id}><td>{site.name}</td><td>{total?.records ?? 0}</td><td>{total?.presentDays.size ?? 0}</td><td>{formatMinutes(total?.completedMinutes ?? 0)}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </AdminShell>;
}
