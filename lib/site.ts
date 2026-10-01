import { Prisma } from "@prisma/client";
import { z } from "zod";

export const siteInputSchema = z.object({
  name: z.string().trim().min(1, "Site name is required."),
  address: z.string().trim().min(1, "Address is required."),
  latitude: z.coerce.number().refine((value) => Number.isFinite(value) && value >= -90 && value <= 90, {
    message: "Latitude must be between -90 and 90.",
  }),
  longitude: z.coerce.number().refine((value) => Number.isFinite(value) && value >= -180 && value <= 180, {
    message: "Longitude must be between -180 and 180.",
  }),
  allowedRadiusMeters: z.coerce.number().int("Allowed radius must be a whole number of meters.").positive("Allowed radius must be a positive number."),
  isActive: z.boolean().optional().default(true),
});

export function toPrismaDecimal(value: number, precision = 6): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(precision));
}

export function serializeSite(site: {
  id: string;
  name: string;
  address: string;
  latitude: Prisma.Decimal | number | string;
  longitude: Prisma.Decimal | number | string;
  allowedRadiusMeters: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const latitude = typeof site.latitude === "string" || typeof site.latitude === "number"
    ? Number(site.latitude)
    : site.latitude.toNumber();
  const longitude = typeof site.longitude === "string" || typeof site.longitude === "number"
    ? Number(site.longitude)
    : site.longitude.toNumber();

  return {
    id: site.id,
    name: site.name,
    address: site.address,
    latitude,
    longitude,
    allowedRadiusMeters: site.allowedRadiusMeters,
    isActive: site.isActive,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  };
}
