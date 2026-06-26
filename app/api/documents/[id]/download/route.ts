import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLocalUpload } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const document = await prisma.uploadedDocument.findFirst({ where: { id, firmId: user.firmId } });
  if (!document) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

  try {
    const file = await readLocalUpload(document.storageKey);
    return new NextResponse(file.bytes, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.originalFileName)}"`
      }
    });
  } catch {
    return NextResponse.json({ error: "Fichier absent du stockage local." }, { status: 404 });
  }
}
