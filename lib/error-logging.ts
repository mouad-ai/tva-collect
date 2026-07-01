import { randomUUID } from "crypto";
import { ErrorSeverity, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export function requestId() {
  return `ERR-${new Date().getFullYear()}-${randomUUID().slice(0, 8)}`;
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
  await prisma.errorLog.create({
    data: {
      requestId: id,
      firmId: firmId || null,
      userId: userId || null,
      route: request ? new URL(request.url).pathname : null,
      method: request?.method || null,
      message,
      stack,
      severity,
      metadata
    }
  }).catch(() => null);
  return id;
}

export function publicError(reference: string) {
  return { error: `Erreur technique. Reference : ${reference}` };
}

export async function loggedApiError(error: unknown, request: Request, context?: { firmId?: string | null; userId?: string | null }) {
  const reference = await logServerError({ error, request, firmId: context?.firmId, userId: context?.userId });
  return NextResponse.json(publicError(reference), { status: 500 });
}
