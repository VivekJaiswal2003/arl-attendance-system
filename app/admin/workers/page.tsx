import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function WorkersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; site?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const query = (resolvedParams.q ?? "").trim();
  const siteFilter = resolvedParams.site ?? "all";

  const today = indiaDateOnly();

  const [workers, sites] = await Promise.all([
    prisma.worker.findMany({
      orderBy: { fullName: "asc" },
      where: {
        ...(query ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { workerId: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        } : {}),
        ...(siteFilter !== "all" ? { selectedSiteId: siteFilter } : {}),
      },
      select: {
        id: true,
        workerId: true,
        fullName: true,
        email: true,
        isActive: true,
        currentJobTitle: true,
        profileCompletionPercentage: true,
        phone: true,
        selectedSite: { select: { name: true } },
        resumes: { where: { isActive: true }, select: { id: true }, take: 1 },
        document: { select: { id: true } },
        attendances: { where: { attendanceDate: today }, select: { status: true }, take: 1 },
      },
    }),
    prisma.site.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return <AdminShell title="Workers">
    <div className="page-heading"><div><div className="eyebrow">People</div><h1>Workers</h1><p>Review the workforce and their selected work sites.</p></div><span className="date-pill">{workers.length} workers</span></div>
    <section className="panel">
      <div className="toolbar">
        <form className="toolbar-form" method="get">
          <input className="field" name="q" defaultValue={query} placeholder="Search by name, email, or ID" aria-label="Search workers" />
          <select className="field" name="site" defaultValue={siteFilter} aria-label="Filter by site">
            <option value="all">All sites</option>
            {sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}
          </select>
          <button className="button-primary small-button" type="submit">Apply</button>
        </form>
      </div>
      {workers.length === 0 ? <EmptyState title="No workers match the current filters" message="Try a broader query." /> : <div className="table-wrap"><table><thead><tr><th>Worker</th><th>Employee ID</th><th>Role / Profile</th><th>Email</th><th>Phone</th><th>Selected site</th><th>Today</th><th>Resume</th><th>Documents</th><th>Status</th><th>Actions</th></tr></thead><tbody>{workers.map((worker) => <tr key={worker.id}><td>{worker.fullName}</td><td>{worker.workerId}</td><td>{worker.currentJobTitle ?? "Profile pending"}<div className="table-subtext">{worker.profileCompletionPercentage}% complete</div></td><td>{worker.email ?? "Not provided"}</td><td>{worker.phone ?? "Not provided"}</td><td>{worker.selectedSite?.name ?? "Not selected"}</td><td>{worker.attendances[0]?.status ?? "Not checked in"}</td><td>{worker.resumes.length ? "Available" : "Missing"}</td><td>{worker.document ? "Uploaded" : "Missing"}</td><td><span className={`status ${worker.isActive ? "status-present" : "status-absent"}`}>{worker.isActive ? "Active" : "Inactive"}</span></td><td><Link href={`/admin/workers/${worker.id}`} className="text-link">View</Link></td></tr>)}</tbody></table></div>}
    </section>
  </AdminShell>;
}
