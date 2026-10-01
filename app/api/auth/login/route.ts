import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  identity: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

const invalidCredentials = "The sign-in details are not valid.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: invalidCredentials }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: invalidCredentials }, { status: 400 });
  }

  const identity = parsed.data.identity;
  const normalizedIdentity = identity.toLowerCase();

  try {
    const admin = await prisma.admin.findUnique({ where: { email: normalizedIdentity } });
    if (admin?.isActive && await bcrypt.compare(parsed.data.password, admin.passwordHash)) {
      await createSession({ userId: admin.id, role: "ADMIN", name: admin.name });
      return NextResponse.json({ redirectTo: "/admin" });
    }

    const worker = await prisma.worker.findFirst({
      where: {
        isActive: true,
        OR: [{ workerId: identity }, { email: normalizedIdentity }],
      },
    });
    if (worker && await bcrypt.compare(parsed.data.password, worker.passwordHash)) {
      await createSession({ userId: worker.id, role: "WORKER", name: worker.fullName });
      return NextResponse.json({ redirectTo: "/worker" });
    }
  } catch (error) {
    console.error("Login authentication failed.", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Authentication service is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  return NextResponse.json({ error: invalidCredentials }, { status: 401 });
}