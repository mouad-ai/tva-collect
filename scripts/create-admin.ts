import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { passwordStrengthError } from "../lib/invites";

const prisma = new PrismaClient();
const defaultPasswords = new Set(["password", "password123", "admin123", "adminadmin", "changeme123", "tvaadmin123"]);

async function askHiddenFallback(prompt: string) {
  const rl = createInterface({ input, output });
  const value = await rl.question(prompt);
  rl.close();
  return value;
}

async function main() {
  const rl = createInterface({ input, output });
  const name = process.env.ADMIN_NAME || (await rl.question("Admin name: "));
  const email = (process.env.ADMIN_EMAIL || (await rl.question("Admin email: "))).trim().toLowerCase();
  rl.close();
  const password = process.env.ADMIN_PASSWORD || (await askHiddenFallback("Admin password: "));

  if (!name.trim() || !email || !email.includes("@")) {
    throw new Error("ADMIN name and valid email are required.");
  }
  const strength = passwordStrengthError(password);
  if (strength) throw new Error(strength);
  if (process.env.NODE_ENV === "production" && defaultPasswords.has(password.toLowerCase())) {
    throw new Error("Refusing a default ADMIN password in production.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== UserRole.ADMIN) {
    throw new Error("A non-admin user already exists with this email.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name, passwordHash, role: UserRole.ADMIN, firmId: null, isActive: true, disabledAt: null, disabledReason: null }
      })
    : await prisma.user.create({
        data: { name, email, passwordHash, role: UserRole.ADMIN, firmId: null, isActive: true }
      });

  console.log(`ADMIN ready: ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
