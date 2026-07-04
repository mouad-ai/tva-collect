import { NextResponse } from "next/server";
import { processLemonSqueezyWebhook, verifyLemonSqueezySignature } from "@/lib/lemonsqueezy";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  await processLemonSqueezyWebhook(payload);
  return NextResponse.json({ ok: true });
}
