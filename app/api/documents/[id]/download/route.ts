import { NextResponse } from "next/server";
import { requireFirmUser } from "@/lib/auth";
import { loggedApiError } from "@/lib/error-logging";
import { assertDocumentDownloadAllowed } from "@/lib/file-security";
import { readLocalUpload } from "@/lib/storage";
import { requireFirmDocument, TenantAccessError } from "@/lib/tenant";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  let document;
  try {
    document = await requireFirmDocument(user.firmId, id);
  } catch (error) {
    if (error instanceof TenantAccessError) return NextResponse.json({ error: error.message }, { status: 404 });
    return loggedApiError(error, request, { firmId: user.firmId, userId: user.id });
  }

  try {
    assertDocumentDownloadAllowed(document.securityScan);
  } catch {
    return NextResponse.json({ error: "Ce fichier est bloque par le contrôle de securite." }, { status: 403 });
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
