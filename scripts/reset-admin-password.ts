import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const prisma = new PrismaClient();
const email = "admin@arlenergy.local";

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const password = (await rl.question("New admin password: ")).trim();
    if (!password) {
      throw new Error("Password is required.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.update({
      where: { email },
      data: { passwordHash },
      select: { email: true },
    });

    console.log("PASSWORD_RESET=PASS");
    console.log(`EMAIL=${admin.email}`);
  } finally {
    rl.close();
  }
}

main()
  .catch((error) => {
    console.error("PASSWORD_RESET=FAIL");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });