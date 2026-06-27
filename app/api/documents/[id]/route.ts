import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireFirmDocument, TenantAccessError } from "@/lib/tenant";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  try {
    await requireFirmDocument(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
  await prisma.uploadedDocument.deleteMany({ where: { id, firmId: user.firmId } });
  return NextResponse.json({ ok: true });
}
