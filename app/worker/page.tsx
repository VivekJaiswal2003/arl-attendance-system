import { SignOutButton } from "@/components/SignOutButton";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";
import { redirect } from "next/navigation";
import { WorkerAttendanceControls } from "@/components/WorkerAttendanceControls";

export const dynamic = "force-dynamic";

export default async function WorkerPage() {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    redirect("/login");
  }

  const [worker, availableSites] = await Promise.all([
    prisma.worker.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        workerId: true,
        fullName: true,
        currentJobTitle: true,
        preferredLocation: true,
        profileCompletionPercentage: true,
        selectedSiteId: true,
        selectedSite: { select: { id: true, name: true, address: true, allowedRadiusMeters: true, isActive: true } },
        skills: { orderBy: { skillName: "asc" }, select: { skillName: true } },
        resumes: { where: { isActive: true }, orderBy: { uploadedAt: "desc" }, take: 1, select: { id: true } },
      },
    }),
    prisma.site.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, address: true, allowedRadiusMeters: true } }),
  ]);

  const today = indiaDateOnly();
  const todayAttendance = worker ? await prisma.attendance.findUnique({
    where: { workerId_attendanceDate: { workerId: worker.id, attendanceDate: today } },
    select: { status: true, distanceFromSiteMeters: true, checkInTime: true, checkOutTime: true, totalWorkingMinutes: true },
  }) : null;

  const selectedSite = worker?.selectedSite?.isActive ? worker.selectedSite : null;
  const selectionIssue = worker?.selectedSiteId && !worker.selectedSite?.isActive ? "Your previously selected work site is no longer active. Please select another active site." : undefined;
  const profileCompletion = worker?.profileCompletionPercentage ?? 0;

  return (
    <main className="worker-page">
      <div className="worker-container">
        <div className="worker-brand-row"><div className="worker-brand">ARL ENGINEERS<small>Workforce Attendance</small></div><SignOutButton /></div>
        <section className="worker-card">
          <div className="worker-identity">
            <h1>{worker?.fullName ?? "Worker profile"}</h1>
            <div className="worker-id">{worker?.currentJobTitle ?? "Professional profile pending"}</div>
          </div>
          <div className="profile-summary-grid">
            <div className="mini-stat"><span>Profile</span><strong>{profileCompletion}%</strong></div>
            <div className="mini-stat"><span>Skills</span><strong>{worker?.skills.length ?? 0}</strong></div>
            <div className="mini-stat"><span>Resume</span><strong>{worker?.resumes.length ? "Ready" : "Missing"}</strong></div>
          </div>
          <div className="worker-details">
            <div><div className="detail-label">Worker name</div><div className="detail-value">{worker?.fullName ?? "--"}</div></div>
            <div><div className="detail-label">Worker ID</div><div className="detail-value">{worker?.workerId ?? "--"}</div></div>
            <div><div className="detail-label">Current job</div><div className="detail-value">{worker?.currentJobTitle ?? "Not set"}</div></div>
            <div><div className="detail-label">Selected work site</div><div className="detail-value">{selectedSite?.name ?? "Select a work site"}</div></div>
            <div><div className="detail-label">Site address</div><div className="detail-value">{selectedSite?.address ?? "Select an active work site"}</div></div>
            <div><div className="detail-label">Allowed radius</div><div className="detail-value">{selectedSite ? `${selectedSite.allowedRadiusMeters} meters` : "Not available"}</div></div>
            <div><div className="detail-label">Preferred location</div><div className="detail-value">{worker?.preferredLocation ?? "Not set"}</div></div>
            <div><div className="detail-label">Skills</div><div className="detail-value">{worker?.skills.length ? worker.skills.map((skill) => skill.skillName).join(", ") : "No skills added yet"}</div></div>
          </div>
          <div className="attendance-status"><div className="detail-label">Current attendance status</div><div className="detail-value">{todayAttendance ? ["PRESENT", "IN_PROGRESS", "COMPLETED"].includes(todayAttendance.status) ? "Present today" : todayAttendance.status === "OUTSIDE_SITE" ? "Outside site" : "Not checked in" : "Not checked in"}</div>{todayAttendance && <div className="status-detail">Checked in at {todayAttendance.checkInTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} · {Math.round(Number(todayAttendance.distanceFromSiteMeters))} m from site</div>}</div>
          <WorkerAttendanceControls selectedSite={selectedSite ? { id: selectedSite.id, name: selectedSite.name, address: selectedSite.address, allowedRadiusMeters: selectedSite.allowedRadiusMeters } : null} availableSites={availableSites} selectionIssue={selectionIssue} initialAttendance={todayAttendance ? { status: todayAttendance.status, checkInTime: todayAttendance.checkInTime.toISOString(), checkOutTime: todayAttendance.checkOutTime?.toISOString(), distanceFromSiteMeters: Number(todayAttendance.distanceFromSiteMeters), totalWorkingMinutes: todayAttendance.totalWorkingMinutes } : null} />
          <p className="worker-notice">Location verification status: Final attendance validation occurs on the server using the selected site coordinates and allowed radius.</p>
        </section>
        <div className="worker-footer">Need help? Contact your site administrator.</div>
      </div>
    </main>
  );
}
