import { FirmStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireFirmAnyRole } from "@/lib/auth";
import { getPlanByCode } from "@/lib/billing";
import { isSameOriginRequest, rejectCrossOrigin } from "@/lib/csrf";
import { logServerError } from "@/lib/error-logging";
import { createLemonSqueezyCheckout, LemonSqueezyConfigError, type BillingInterval } from "@/lib/lemonsqueezy";

function validInterval(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return rejectCrossOrigin();
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);
  if (user.firm.status === FirmStatus.CANCELLED) {
    return NextResponse.json({ error: "Cabinet annule. Contactez le support." }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { planCode?: string; interval?: string };
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
  } catch (error) {
    if (error instanceof LemonSqueezyConfigError) {
      // Missing env var — a configuration problem, not a user error. Log
      // the reference server-side (message only, never secrets) and give
      // the user a clean, actionable message instead of a raw 500.
      const reference = await logServerError({ error, request, firmId: user.firmId, userId: user.id });
      return NextResponse.json({ error: `Paiement en ligne non configure. Reference : ${reference}` }, { status: 503 });
    }
    const reference = await logServerError({ error, request, firmId: user.firmId, userId: user.id });
    return NextResponse.json({ error: `Erreur Lemon Squeezy. Reessayez ou contactez le support. Reference : ${reference}` }, { status: 502 });
  }
}
