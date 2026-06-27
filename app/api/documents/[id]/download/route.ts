import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { readLocalUpload } from "@/lib/storage";
import { requireFirmDocument, TenantAccessError } from "@/lib/tenant";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let document;
  try {
    document = await requireFirmDocument(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }

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
