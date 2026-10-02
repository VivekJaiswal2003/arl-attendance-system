import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = body as { latitude?: unknown; longitude?: unknown };
  const latitude = typeof payload.latitude === "number" && Number.isFinite(payload.latitude) ? payload.latitude : null;
  const longitude = typeof payload.longitude === "number" && Number.isFinite(payload.longitude) ? payload.longitude : null;
  if (latitude !== null && (latitude < -90 || latitude > 90) || longitude !== null && (longitude < -180 || longitude > 180)) {
    return NextResponse.json({ error: "Invalid checkout location." }, { status: 400 });
  }

  const attendanceDate = indiaDateOnly();
  const attendance = await prisma.attendance.findUnique({
    where: { workerId_attendanceDate: { workerId: session.userId, attendanceDate } },
  });

  if (!attendance) {
    return NextResponse.json({ error: "No attendance check-in was found for today." }, { status: 404 });
  }
  if (attendance.checkOutTime || attendance.status === "COMPLETED") {
    return NextResponse.json({ error: "Attendance has already been completed for today.", attendance: { checkOutTime: attendance.checkOutTime?.toISOString(), totalWorkingMinutes: attendance.totalWorkingMinutes } }, { status: 409 });
  }
  if (attendance.status !== "IN_PROGRESS" && attendance.status !== "PRESENT") {
    return NextResponse.json({ error: "Only a valid attendance check-in can be checked out." }, { status: 422 });
  }

  const checkOutTime = new Date();
  const totalWorkingMinutes = Math.max(0, Math.floor((checkOutTime.getTime() - attendance.checkInTime.getTime()) / 60000));
  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOutTime,
      checkOutLatitude: latitude,
      checkOutLongitude: longitude,
      totalWorkingMinutes,
      status: "COMPLETED",
    },
  });

  return NextResponse.json({
    message: "Attendance completed.",
    checkOutTime: updated.checkOutTime?.toISOString(),
    totalWorkingMinutes: updated.totalWorkingMinutes,
  });
}
