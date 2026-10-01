import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateProfileCompletion } from "@/lib/profile";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().min(6, "Phone number is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(8, "Confirm password."),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid registration payload." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid registration details." }, { status: 400 });
  }

  const data = parsed.data;
  if (data.password !== data.confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const normalizedEmail = data.email.toLowerCase();

  try {
    const existingWorker = await prisma.worker.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { fullName: { equals: `${data.firstName} ${data.lastName}` } },
        ],
      },
      select: { id: true },
    });

    if (existingWorker) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const workerId = `W-${Date.now().toString().slice(-8)}`;
    const passwordHash = await bcrypt.hash(data.password, 12);
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const skillCount = 0;
    const worker = await prisma.worker.create({
      data: {
        workerId,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        email: normalizedEmail,
        phone: data.phone,
        passwordHash,
        profileCompletionPercentage: calculateProfileCompletion({
          firstName: data.firstName,
          lastName: data.lastName,
          email: normalizedEmail,
          phone: data.phone,
          skillsCount: skillCount,
          educationCount: 0,
          experienceCount: 0,
        }),
      },
    });

    await createSession({ userId: worker.id, role: "WORKER", name: worker.fullName });

    return NextResponse.json({
      ok: true,
      redirectTo: "/profile",
      workerId: worker.workerId,
    }, { status: 201 });
  } catch (error) {
    console.error("Registration failed.", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Unable to create the account right now." }, { status: 500 });
  }
}
