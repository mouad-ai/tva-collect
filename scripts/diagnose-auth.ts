import { PrismaClient, FirmStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function destination(user: { role: UserRole; firmId: string | null; firm: { status: FirmStatus } | null }) {
  if (user.role === UserRole.ADMIN) return "/admin";
  if (!user.firmId || !user.firm) return "BLOCKED: account has no firm, app redirects to /forbidden";
  if (user.firm.status === FirmStatus.SUSPENDED || user.firm.status === FirmStatus.CANCELLED) return "/app/suspended";
  return "/app";
}

async function main() {
  const email = (process.env.AUTH_EMAIL || process.argv[2] || "").trim();
  const password = process.env.AUTH_PASSWORD || process.argv[3] || "";

  if (!email) {
    throw new Error("Set AUTH_EMAIL or pass email as the first argument.");
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.toLowerCase(), mode: "insensitive" } },
    include: { firm: true }
  });

  if (!user) {
    console.log(JSON.stringify({ found: false, email }, null, 2));
    return;
  }

  const passwordMatches = password && user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : undefined;

  console.log(
    JSON.stringify(
      {
        found: true,
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        firmId: user.firmId,
        firmName: user.firm?.name ?? null,
        firmStatus: user.firm?.status ?? null,
        hasPasswordHash: Boolean(user.passwordHash),
        passwordMatches,
        expectedDestination: destination(user)
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
