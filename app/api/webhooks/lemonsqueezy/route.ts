import { NextResponse } from "next/server";
import { logServerError } from "@/lib/error-logging";
import { processLemonSqueezyWebhook, verifyLemonSqueezySignature } from "@/lib/lemonsqueezy";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    // Never log the raw body/signature here — just the fact that verification failed.
    await logServerError({ error: new Error("Lemon Squeezy webhook signature verification failed"), request });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch (error) {
    await logServerError({ error, request });
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    // processLemonSqueezyWebhook already durably persists the event (with
    // any processingError) to BillingEvent before it re-throws, so the data
    // is safe either way. Returning 500 here lets Lemon Squeezy retry —
    // useful for transient failures — without ever leaking a stack trace.
    await processLemonSqueezyWebhook(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const reference = await logServerError({ error, request });
    return NextResponse.json({ error: `Webhook processing failed. Reference: ${reference}` }, { status: 500 });
  }
}
