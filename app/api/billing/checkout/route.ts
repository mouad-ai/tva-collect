import { FirmStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireFirmAnyRole } from "@/lib/auth";
import { getPlanByCode } from "@/lib/billing";
import { createLemonSqueezyCheckout, type BillingInterval } from "@/lib/lemonsqueezy";

function validInterval(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function POST(request: Request) {
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  if (user.firm.status === FirmStatus.CANCELLED) {
    return NextResponse.json({ error: "Cabinet annule. Contactez le support." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { planCode?: string; interval?: string };
  const planCode = String(body.planCode || "").toUpperCase();
  const interval = validInterval(body.interval);
  if (!["STARTER", "PRO", "PREMIUM"].includes(planCode)) {
    return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
  }

  const plan = await getPlanByCode(planCode);
  const variantId = interval === "yearly" ? plan?.lemonYearlyVariantId : plan?.lemonMonthlyVariantId;
  if (!plan || !variantId) {
    return NextResponse.json({ error: "Ce plan n'est pas encore configure pour Lemon Squeezy." }, { status: 400 });
  }

  const checkoutUrl = await createLemonSqueezyCheckout({
    firmId: user.firmId,
    userId: user.id,
    planCode,
    interval
  });
  return NextResponse.json({ checkoutUrl });
}
