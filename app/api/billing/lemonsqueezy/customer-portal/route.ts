import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireFirmAnyRole } from "@/lib/auth";
import { isSameOriginRequest, rejectCrossOrigin } from "@/lib/csrf";
import { logServerError } from "@/lib/error-logging";
import { fetchLemonSqueezyCustomerPortalUrl, LemonSqueezyConfigError } from "@/lib/lemonsqueezy";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return rejectCrossOrigin();
  const user = await requireFirmAnyRole([UserRole.OWNER, UserRole.MANAGER]);

  const subscription = await prisma.firmSubscription.findUnique({ where: { firmId: user.firmId } });
  if (!subscription || subscription.provider !== "LEMON_SQUEEZY" || !subscription.lemonSubscriptionId) {
    return NextResponse.json(
      { error: "Aucun abonnement Lemon Squeezy actif pour ce cabinet. Le portail n'est disponible que pour les abonnements payes en ligne." },
      { status: 404 }
    );
  }

  try {
    const { customerPortalUrl, updatePaymentMethodUrl } = await fetchLemonSqueezyCustomerPortalUrl(subscription.lemonSubscriptionId);
    await prisma.firmSubscription.update({
      where: { firmId: user.firmId },
      data: { customerPortalUrl, updatePaymentMethodUrl }
    });
    return NextResponse.json({ portalUrl: customerPortalUrl });
  } catch (error) {
    if (error instanceof LemonSqueezyConfigError) {
      const reference = await logServerError({ error, request, firmId: user.firmId, userId: user.id });
      return NextResponse.json({ error: `Paiement en ligne non configure. Reference : ${reference}` }, { status: 503 });
    }
    const reference = await logServerError({ error, request, firmId: user.firmId, userId: user.id });
    return NextResponse.json({ error: `Erreur Lemon Squeezy. Reessayez ou contactez le support. Reference : ${reference}` }, { status: 502 });
  }
}
