import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { haversineDistanceMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";

const checkInSchema = z.object({
  siteId: z.string().trim().min(1, "Select a work site.").max(191),
  latitude: z.number().finite().min(-90, "Latitude must be between -90 and 90.").max(90, "Latitude must be between -90 and 90."),
  longitude: z.number().finite().min(-180, "Longitude must be between -180 and 180.").max(180, "Longitude must be between -180 and 180."),
  accuracy: z.number().finite().min(0, "GPS accuracy must be a valid non-negative number.").max(200, "GPS accuracy is too poor. Please enable better location accuracy and try again."),
}).strict();

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WORKER") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid attendance payload." }, { status: 400 });
  }

  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid location data." }, { status: 400 });
  }

  try {
    const worker = await prisma.worker.findUnique({
      where: { id: session.userId },
      select: { id: true, isActive: true, selectedSiteId: true },
    });

    if (!worker || !worker.isActive) {
      return NextResponse.json({ error: "Worker not found or inactive." }, { status: 404 });
    }

    if (!worker.selectedSiteId) {
      return NextResponse.json({ error: "Select an active work site before marking attendance." }, { status: 422 });
    }
    if (worker.selectedSiteId !== parsed.data.siteId) {
      return NextResponse.json({ error: "Your selected work site has changed. Refresh the page and try again." }, { status: 409 });
    }

    const site = await prisma.site.findFirst({ where: { id: worker.selectedSiteId, isActive: true } });
    if (!site) {
      return NextResponse.json({ error: "Selected work site is not active or no longer exists." }, { status: 422 });
    }

    const attendanceDate = indiaDateOnly();

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        workerId_attendanceDate: {
          workerId: worker.id,
          attendanceDate,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json({ error: "Attendance already marked for today." }, { status: 409 });
    }

    const distanceFromSiteMeters = haversineDistanceMeters(
      parsed.data.latitude,
      parsed.data.longitude,
      Number(site.latitude),
      Number(site.longitude),
    );

    const withinRadius = distanceFromSiteMeters <= site.allowedRadiusMeters;
    if (!withinRadius) {
      return NextResponse.json({ error: "You are outside the allowed work-site area.", distanceFromSiteMeters, allowedRadiusMeters: site.allowedRadiusMeters, status: "OUTSIDE_SITE" }, { status: 422 });
    }
    const status = "IN_PROGRESS";

    const checkInTime = new Date();
    const attendance = await prisma.attendance.create({
      data: {
        workerId: worker.id,
        siteId: site.id,
        attendanceDate,
        checkInTime,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        distanceFromSiteMeters: distanceFromSiteMeters,
        status,
      },
    });

    return NextResponse.json({
      status,
      message: "Attendance marked successfully.",
      distanceFromSiteMeters: Number(attendance.distanceFromSiteMeters),
      checkInTime: attendance.checkInTime.toISOString(),
    }, { status: 200 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Attendance already marked for today." }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
