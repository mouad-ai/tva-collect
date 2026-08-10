import { randomUUID } from "crypto";
import { ErrorSeverity, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export function requestId() {
  return `ERR-${new Date().getFullYear()}-${randomUUID().slice(0, 8)}`;
}

/**
 * Best-effort alert for ERROR/CRITICAL severities via a generic incoming
 * webhook (Slack, Discord, Teams, or any endpoint that accepts a JSON
 * `{ text }` body — Slack/Discord/Mattermost all do). This is the entire
 * "monitoring" story until a real APM is wired in: no external account or
 * new dependency required, and it's a no-op unless ALERT_WEBHOOK_URL is set.
 * Never throws — a broken webhook must not compound the error being reported.
 */
async function sendCriticalErrorAlert(input: { id: string; message: string; severity: ErrorSeverity; route: string | null; firmId: string | null }) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;
  if (input.severity !== ErrorSeverity.ERROR && input.severity !== ErrorSeverity.CRITICAL) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `[TVA Collect] ${input.severity} ${input.route || ""} — ${input.message.slice(0, 300)} (ref: ${input.id}${input.firmId ? `, firm: ${input.firmId}` : ""})`
      }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    // Alerting must never break the caller — the error is already durably
    // logged to ErrorLog regardless of whether this notification succeeds.
  }
}

export async function logServerError({
  error,
  request,
  firmId,
  userId,
  severity = ErrorSeverity.ERROR,
  metadata
}: {
  error: unknown;
  request?: Request;
  firmId?: string | null;
  userId?: string | null;
  severity?: ErrorSeverity;
  metadata?: Prisma.InputJsonValue;
}) {
  const id = requestId();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : null;
  const route = request ? new URL(request.url).pathname : null;
  await prisma.errorLog.create({
    data: {
      requestId: id,
      firmId: firmId || null,
      userId: userId || null,
      route,
      method: request?.method || null,
      message,
      stack,
      severity,
      metadata
    }
  }).catch(() => null);
  await sendCriticalErrorAlert({ id, message, severity, route, firmId: firmId || null });
  return id;
}

export function publicError(reference: string) {
  return { error: `Erreur technique. Reference : ${reference}` };
}

export async function loggedApiError(error: unknown, request: Request, context?: { firmId?: string | null; userId?: string | null }) {
  const reference = await logServerError({ error, request, firmId: context?.firmId, userId: context?.userId });
  return NextResponse.json(publicError(reference), { status: 500 });
}
