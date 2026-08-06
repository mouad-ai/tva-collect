import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { loggedApiError } from "@/lib/error-logging";
import { rateLimit } from "@/lib/rate-limit";
import type { handleInboundReply } from "@/trigger/handle-inbound-reply";

// The WhatsApp bridge (whatsapp-bridge/) forwards every inbound message here.
// This route does the minimum possible synchronously — auth check, validate,
// hand off to Trigger.dev — because the AI classification + reply drafting
// can take a few seconds and there's no reason to make the bridge (and by
// extension the actual WhatsApp connection) wait on that.

const bodySchema = z.object({
  phone: z.string().min(1),
  body: z.string().min(1),
  receivedAt: z.string()
});

export async function POST(request: Request) {
  try {
    const token = request.headers.get("X-Bridge-Token");
    if (!token || token !== process.env.WHATSAPP_BRIDGE_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Bridge-token auth already rules out random internet abuse, but a single
    // prospect (or a stuck retry loop on the bridge side) sending a burst of
    // messages would otherwise trigger a matching burst of Claude API calls —
    // this caps the real cost exposure per conversation, not just per IP.
    const { allowed } = await rateLimit({ key: `whatsapp-inbound:phone:${parsed.data.phone}`, limit: 20, windowMs: 60 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    await tasks.trigger<typeof handleInboundReply>("handle-inbound-reply", parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return loggedApiError(error, request);
  }
}
