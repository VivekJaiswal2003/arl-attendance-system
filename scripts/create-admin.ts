import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const prisma = new PrismaClient();

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const name = await prompt("Admin name: ");
  if (!name) {
    console.error("Admin name is required.");
    process.exitCode = 1;
    return;
  }

  const email = await prompt("Admin email: ");
  if (!email) {
    console.error("Admin email is required.");
    process.exitCode = 1;
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingAdmin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (existingAdmin) {
    console.log(`Admin already exists with email: ${normalizedEmail}`);
    return;
  }

  const password = await prompt("Admin password: ");
  if (!password) {
    console.error("Admin password is required.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      isActive: true,
    },
    select: {
      email: true,
      name: true,
      isActive: true,
    },
  });

  console.log("ADMIN_CREATED=PASS");
  console.log(`EMAIL=${admin.email}`);
  console.log(`NAME=${admin.name}`);
  console.log(`IS_ACTIVE=${admin.isActive}`);
}

main()
  .catch((error) => {
    console.error("Error creating admin:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
