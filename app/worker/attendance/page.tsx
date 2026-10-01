import { redirect } from "next/navigation";
import { WorkerAttendanceControls } from "@/components/WorkerAttendanceControls";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function WorkerAttendancePage() {
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
        selectedSiteId: true,
        selectedSite: { select: { id: true, name: true, address: true, allowedRadiusMeters: true, isActive: true } },
      },
    }),
    prisma.site.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, address: true, allowedRadiusMeters: true } }),
  ]);

  if (!worker) {
    redirect("/worker");
  }

  const selectedSite = worker.selectedSite?.isActive ? worker.selectedSite : null;
  const selectionIssue = worker.selectedSiteId && !worker.selectedSite?.isActive ? "Your previously selected work site is no longer active. Please select another active site." : undefined;
  const today = indiaDateOnly();

  const todayAttendance = await prisma.attendance.findUnique({
    where: {
      workerId_attendanceDate: {
        workerId: worker.id,
        attendanceDate: today,
      },
    },
  });

  return <main className="worker-page"><div className="worker-container"><div className="worker-brand-row"><div className="worker-brand">ARL ENGINEERS<small>Workforce Attendance</small></div></div><section className="worker-card"><div className="worker-identity"><h1>Attendance</h1><div className="worker-id">{worker.fullName} · {worker.workerId}</div></div><WorkerAttendanceControls selectedSite={selectedSite ? { id: selectedSite.id, name: selectedSite.name, address: selectedSite.address, allowedRadiusMeters: selectedSite.allowedRadiusMeters } : null} availableSites={availableSites} selectionIssue={selectionIssue} initialAttendance={todayAttendance ? { status: todayAttendance.status, checkInTime: todayAttendance.checkInTime.toISOString(), checkOutTime: todayAttendance.checkOutTime?.toISOString(), distanceFromSiteMeters: Number(todayAttendance.distanceFromSiteMeters), totalWorkingMinutes: todayAttendance.totalWorkingMinutes } : null} /></section></div></main>;
}
