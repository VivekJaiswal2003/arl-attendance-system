import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { siteInputSchema } from "@/lib/site";

const siteQuerySchema = z.object({
  includeInactive: z.enum(["true", "false"]).optional(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = siteQuerySchema.safeParse({ includeInactive: url.searchParams.get("includeInactive") ?? undefined });

  try {
    const includeInactive = parsed.success ? parsed.data.includeInactive === "true" : false;
    const sites = await prisma.site.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        allowedRadiusMeters: true,
        isActive: true,
      },
    });

    return NextResponse.json({ sites: sites.map((site) => ({
      ...site,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
    })) });
  } catch {
    return NextResponse.json({ error: "Unable to load sites." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid site payload." }, { status: 400 });
  }

  const parsed = siteInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid site data." }, { status: 400 });
  }

  try {
    const site = await prisma.site.create({
      data: {
        name: parsed.data.name,
        address: parsed.data.address,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        allowedRadiusMeters: parsed.data.allowedRadiusMeters,
        isActive: parsed.data.isActive,
      },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, allowedRadiusMeters: true, isActive: true },
    });

    return NextResponse.json({
      site: {
        ...site,
        latitude: Number(site.latitude),
        longitude: Number(site.longitude),
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Site could not be created." }, { status: 500 });
  }
}
