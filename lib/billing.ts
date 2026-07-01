import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultPlans() {
  const plans = [
    { code: "STARTER", name: "Cabinet Starter", monthlyPriceMad: 999, clientLimit: 30, userLimit: 5, storageLimitMb: 2048, activeCollectionLimit: 3 },
    { code: "PRO", name: "Cabinet Pro", monthlyPriceMad: 1999, clientLimit: 100, userLimit: 15, storageLimitMb: 10240, activeCollectionLimit: 12, hasZipExport: true, hasAdvancedReports: true },
    { code: "PREMIUM", name: "Cabinet Premium", monthlyPriceMad: 3999, clientLimit: 300, userLimit: 40, storageLimitMb: 51200, activeCollectionLimit: 36, hasZipExport: true, hasAdvancedReports: true, hasWhiteLabel: true, hasWorkflowBuilder: true }
  ];
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan
    });
  }
}

export async function requireWithinPlanLimit(firmId: string, limitType: "clients" | "users" | "activeCollections") {
  const subscription = await prisma.firmSubscription.findUnique({ where: { firmId }, include: { plan: true } });
  if (!subscription) return;
  if (limitType === "clients") {
    const count = await prisma.client.count({ where: { firmId, deletedAt: null } });
    if (count >= subscription.plan.clientLimit) throw new Error("Limite clients du plan atteinte.");
  }
  if (limitType === "users") {
    const count = await prisma.user.count({ where: { firmId, deletedAt: null } });
    if (count >= subscription.plan.userLimit) throw new Error("Limite utilisateurs du plan atteinte.");
  }
  if (limitType === "activeCollections") {
    const count = await prisma.collectionPeriod.count({ where: { firmId, status: "ACTIVE", deletedAt: null } });
    if (count >= subscription.plan.activeCollectionLimit) throw new Error("Limite collectes actives du plan atteinte.");
  }
}

export async function requirePlanFeature(firmId: string, featureKey: "hasZipExport" | "hasAdvancedReports" | "hasWhiteLabel" | "hasWorkflowBuilder") {
  const subscription = await prisma.firmSubscription.findUnique({ where: { firmId }, include: { plan: true } });
  if (!subscription || !subscription.plan[featureKey]) throw new Error("Fonctionnalite non incluse dans le plan.");
}

export function canUseBilling(role: UserRole) {
  return role === UserRole.OWNER;
}
