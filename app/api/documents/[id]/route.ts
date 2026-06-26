import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await prisma.uploadedDocument.deleteMany({ where: { id, firmId: user.firmId } });
  return NextResponse.json({ ok: true });
}
