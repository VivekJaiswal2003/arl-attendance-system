import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { haversineDistanceMeters } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { indiaDateOnly } from "@/lib/time";

const checkInSchema = z.object({
  latitude: z.coerce.number().refine((value) => Number.isFinite(value), {
    message: "Latitude must be a valid number.",
  }),
  longitude: z.coerce.number().refine((value) => Number.isFinite(value), {
    message: "Longitude must be a valid number.",
  }),
  accuracy: z.coerce.number().finite().positive(),
  timestamp: z.coerce.number().optional(),
});

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

  const latitude = parsed.data.latitude;
  const longitude = parsed.data.longitude;
  const accuracy = parsed.data.accuracy;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return NextResponse.json({ error: "Latitude must be between -90 and 90." }, { status: 400 });
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Longitude must be between -180 and 180." }, { status: 400 });
  }

  if (Number.isFinite(accuracy) && accuracy > 200) {
    return NextResponse.json({
      error: "GPS accuracy is too poor. Please enable better location accuracy and try again.",
    }, { status: 422 });
  }

  try {
    const worker = await prisma.worker.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        isActive: true,
        selectedSiteId: true,
      },
    });

    if (!worker || !worker.isActive) {
      return NextResponse.json({ error: "Worker not found." }, { status: 404 });
    }

    if (!worker.selectedSiteId) {
      return NextResponse.json({ error: "Please select a work site before marking attendance." }, { status: 422 });
    }
    const site = await prisma.site.findUnique({
      where: { id: worker.selectedSiteId },
      select: { id: true, name: true, latitude: true, longitude: true, allowedRadiusMeters: true, isActive: true },
    });
    if (!site) {
      return NextResponse.json({ error: "Your assigned work site could not be found. Please contact the administrator." }, { status: 422 });
    }
    if (!site.isActive) {
      return NextResponse.json({ error: "Your selected work site is inactive. Please select an active site." }, { status: 422 });
    }

    const attendanceDate = indiaDateOnly();

    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        workerId_attendanceDate: {
          workerId: worker.id,
          attendanceDate,
        },
      },
      select: { id: true },
    });

    if (existingAttendance) {
      return NextResponse.json({ error: "Attendance already marked for today." }, { status: 409 });
    }

    const distanceFromSiteMeters = haversineDistanceMeters(
      latitude,
      longitude,
      Number(site.latitude),
      Number(site.longitude),
    );

    const withinRadius = distanceFromSiteMeters <= site.allowedRadiusMeters;
    if (!withinRadius) {
      return NextResponse.json({
        error: `You are ${Math.round(distanceFromSiteMeters)} meters from ${site.name}. Allowed radius is ${site.allowedRadiusMeters} meters.`,
        distanceFromSiteMeters,
        allowedRadiusMeters: site.allowedRadiusMeters,
        siteName: site.name,
        status: "OUTSIDE_SITE",
      }, { status: 422 });
    }
    const status = "PRESENT";

    const checkInTime = new Date();
    const attendance = await prisma.attendance.create({
      data: {
        workerId: worker.id,
        siteId: site.id,
        attendanceDate,
        checkInTime,
        latitude: latitude,
        longitude: longitude,
        distanceFromSiteMeters: distanceFromSiteMeters,
        status,
      },
      select: { checkInTime: true, distanceFromSiteMeters: true },
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
