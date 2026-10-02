import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { DeleteWorkerButton } from "@/components/DeleteWorkerButton";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INDIA_TIMEZONE } from "@/lib/time";

export const dynamic = "force-dynamic";

function formatMinutes(value: number | null) {
  return value === null ? "In Progress" : `${Math.floor(value / 60)}h ${value % 60}m`;
}

export default async function AdminWorkerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams?: Promise<{ saved?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const { workerId } = await params;
  const query = searchParams ? await searchParams : {};
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      workerId: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      professionalSummary: true,
      currentJobTitle: true,
      totalExperience: true,
      preferredLocation: true,
      profileCompletionPercentage: true,
      isActive: true,
      selectedSiteId: true,
      selectedSite: { select: { id: true, name: true, address: true, allowedRadiusMeters: true, isActive: true } },
      skills: { select: { id: true, skillName: true, skillLevel: true } },
      educations: { select: { id: true, degree: true, institution: true } },
      experiences: { select: { id: true, jobTitle: true, companyName: true } },
      resumes: { where: { isActive: true }, select: { id: true, fileName: true, mimeType: true, isActive: true } },
      document: { select: { id: true, fileName: true, fileSize: true, uploadedAt: true } },
      attendances: {
        orderBy: { checkInTime: "desc" },
        take: 10,
        select: {
          id: true,
          attendanceDate: true,
          checkInTime: true,
          checkOutTime: true,
          totalWorkingMinutes: true,
          status: true,
          distanceFromSiteMeters: true,
          site: { select: { name: true } },
        },
      },
    },
  });

  if (!worker) {
    redirect("/admin/workers");
  }

  return (
    <AdminShell title="Worker profile">
      <div className="page-heading">
        <div>
          <div className="eyebrow">People</div>
          <h1>{worker.fullName}</h1>
          <p>{worker.email ?? "No email provided"} · {worker.workerId}</p>
        </div>
        <Link href="/admin/workers" className="button-secondary small-button">Back to workers</Link>
        <DeleteWorkerButton workerId={worker.id} workerName={worker.fullName} />
      </div>
      {query.saved === "1" && <p className="form-success" role="status">Worker changes saved.</p>}

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div><h2 className="panel-title">Profile overview</h2><span className="panel-note">Professional data</span></div>
          </div>
          <div className="list">
            <div className="list-row"><span>Current role</span><strong>{worker.currentJobTitle ?? "No current role"}</strong></div>
            <div className="list-row"><span>Phone</span><strong>{worker.phone ?? "Not provided"}</strong></div>
            <div className="list-row"><span>Preferred location</span><strong>{worker.preferredLocation ?? "Not provided"}</strong></div>
            <div className="list-row"><span>Experience</span><strong>{worker.totalExperience ?? "Not provided"}</strong></div>
            <div className="list-row"><span>Profile completion</span><strong>{worker.profileCompletionPercentage}%</strong></div>
            <div className="list-row"><span>Selected work site</span><strong>{worker.selectedSite?.isActive ? worker.selectedSite.name : worker.selectedSiteId ? "Previously selected site is inactive" : "No work site has been selected."}</strong></div>
            {worker.selectedSite?.isActive && <div className="list-row"><span>Site address</span><strong>{worker.selectedSite.address}</strong></div>}
            {worker.selectedSite?.isActive && <div className="list-row"><span>Allowed radius</span><strong>{worker.selectedSite.allowedRadiusMeters} meters</strong></div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><h2 className="panel-title">Edit worker</h2><span className="panel-note">Profile and activation</span></div>
          </div>
          <form action={`/api/admin/workers/${worker.id}`} method="post" className="site-form">
            <div className="site-form-grid">
              <label className="form-label">First name<input className="form-input" name="firstName" defaultValue={worker.firstName ?? ""} /></label>
              <label className="form-label">Last name<input className="form-input" name="lastName" defaultValue={worker.lastName ?? ""} /></label>
              <label className="form-label">Phone<input className="form-input" name="phone" defaultValue={worker.phone ?? ""} /></label>
              <label className="form-label">Current job<input className="form-input" name="currentJobTitle" defaultValue={worker.currentJobTitle ?? ""} /></label>
              <label className="form-label">Preferred location<input className="form-input" name="preferredLocation" defaultValue={worker.preferredLocation ?? ""} /></label>
              <label className="form-label">Address<input className="form-input" name="address" defaultValue={worker.address ?? ""} /></label>
              <label className="form-label" style={{ gridColumn: "1 / -1" }}>Professional summary<textarea className="form-input" name="professionalSummary" rows={4} defaultValue={worker.professionalSummary ?? ""} /></label>
              <label className="form-label">Status<select className="form-input" defaultValue={worker.isActive ? "active" : "inactive"} name="isActive">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select></label>
            </div>
            <div className="site-form-actions">
              <button className="button-primary" type="submit">Save worker</button>
            </div>
          </form>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-header"><div><h2 className="panel-title">Professional summary</h2><span className="panel-note">Candidate profile data</span></div></div>
        <div className="list-row"><span>Summary</span><strong>{worker.professionalSummary ?? "Not provided"}</strong></div>
      </section>

      <div className="two-column" style={{ marginTop: 24 }}>
        <section className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Skills</h2><span className="panel-note">{worker.skills.length} records</span></div></div>
          {worker.skills.length === 0 ? <div className="empty-state"><strong>No skills</strong><span>No skills were added for this worker.</span></div> : <ul className="list">{worker.skills.map((skill) => <li key={skill.id} className="list-row"><span>{skill.skillName}</span><strong>{skill.skillLevel ?? "—"}</strong></li>)}</ul>}
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Resume</h2><span className="panel-note">Uploaded files</span></div></div>
          {worker.resumes.length === 0 ? <div className="empty-state"><strong>No resume</strong><span>No resume has been uploaded.</span></div> : <ul className="list">{worker.resumes.map((resume) => <li key={resume.id} className="list-row"><a className="text-link" href={`/api/admin/workers/${worker.id}/resume/${resume.id}`} target="_blank" rel="noreferrer">{resume.fileName}</a><strong>{resume.mimeType}</strong></li>)}</ul>}
        </section>
      </div>

      <div className="two-column" style={{ marginTop: 24 }}>
        <section className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Documents</h2><span className="panel-note">Required document bundle</span></div></div>
          {worker.document ? (
            <ul className="list">
              <li className="list-row">
                <a className="text-link" href={`/api/admin/workers/${worker.id}/documents/file`} target="_blank" rel="noreferrer">{worker.document.fileName}</a>
                <strong>{(worker.document.fileSize / (1024 * 1024)).toFixed(1)} MB</strong>
              </li>
              <li className="list-row"><span>Uploaded</span><strong>{worker.document.uploadedAt.toLocaleDateString("en-IN", { timeZone: "UTC" })}</strong></li>
            </ul>
          ) : <div className="empty-state"><strong>No documents</strong><span>This worker has not uploaded their documents yet.</span></div>}
        </section>
      </div>

      <div className="two-column" style={{ marginTop: 24 }}>
        <section className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Education</h2><span className="panel-note">{worker.educations.length} records</span></div></div>
          {worker.educations.length === 0 ? <div className="empty-state"><strong>No education</strong><span>No education records were added.</span></div> : <ul className="list">{worker.educations.map((education) => <li key={education.id} className="list-row"><span>{education.degree}</span><strong>{education.institution}</strong></li>)}</ul>}
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Experience</h2><span className="panel-note">{worker.experiences.length} records</span></div></div>
          {worker.experiences.length === 0 ? <div className="empty-state"><strong>No experience</strong><span>No work history was added.</span></div> : <ul className="list">{worker.experiences.map((experience) => <li key={experience.id} className="list-row"><span>{experience.jobTitle}</span><strong>{experience.companyName}</strong></li>)}</ul>}
        </section>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-header"><div><h2 className="panel-title">Attendance history</h2><span className="panel-note">Recent check-ins</span></div></div>
        {worker.attendances.length === 0 ? <div className="empty-state"><strong>No attendance</strong><span>No attendance records were found.</span></div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Site</th><th>Check-in</th><th>Check-out</th><th>Hours</th><th>Status</th><th>Distance</th></tr></thead><tbody>{worker.attendances.map((attendance) => <tr key={attendance.id}><td>{attendance.attendanceDate.toLocaleDateString("en-IN", { timeZone: "UTC" })}</td><td>{attendance.site.name}</td><td>{attendance.checkInTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: INDIA_TIMEZONE })}</td><td>{attendance.checkOutTime?.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: INDIA_TIMEZONE }) ?? "—"}</td><td>{formatMinutes(attendance.totalWorkingMinutes)}</td><td><span className={`status ${attendance.status === "COMPLETED" ? "status-present" : attendance.status === "IN_PROGRESS" ? "status-late" : "status-outside"}`}>{attendance.status}</span></td><td>{Math.round(Number(attendance.distanceFromSiteMeters))} m</td></tr>)}</tbody></table></div>}
      </section>
    </AdminShell>
  );
}
