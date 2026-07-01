import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertStrongPassword } from "@/lib/password";

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const name = process.env.ADMIN_NAME || "TVA Collect Admin";
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD.");
  }
  assertStrongPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Admin user already exists.");

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firmId: null,
      role: UserRole.ADMIN,
      isActive: true
    }
  });
  console.log(`Admin created: ${email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
