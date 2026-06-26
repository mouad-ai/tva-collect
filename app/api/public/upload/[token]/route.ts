import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveLocalUpload, validateUpload } from "@/lib/storage";
import { recalculateClientCollectionStatus } from "@/lib/tva";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await prisma.clientCollection.findUnique({
    where: { uploadToken: token },
    include: {
      firm: true,
      client: true,
      collectionPeriod: true,
      requiredDocuments: { orderBy: { createdAt: "asc" } },
      uploadedDocuments: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!item || item.collectionPeriod.status === "CLOSED") {
    return NextResponse.json({ error: "Lien de depot indisponible." }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await prisma.clientCollection.findUnique({
    where: { uploadToken: token },
    include: { collectionPeriod: true, requiredDocuments: true }
  });
  if (!item || item.collectionPeriod.status === "CLOSED") {
    return NextResponse.json({ error: "Lien de depot indisponible." }, { status: 404 });
  }

  const formData = await request.formData();
  const uploadedByName = String(formData.get("uploadedByName") || "");
  const uploaderComment = String(formData.get("uploaderComment") || "");
  const requiredDocumentId = String(formData.get("requiredDocumentId") || "");
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "Ajoutez au moins un fichier." }, { status: 400 });
  }

  const targetDoc = requiredDocumentId
    ? item.requiredDocuments.find((doc) => doc.id === requiredDocumentId)
    : null;

  for (const file of files) {
    const error = validateUpload(file);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const saved = await saveLocalUpload(file, item.id);
    await prisma.uploadedDocument.create({
      data: {
        firmId: item.firmId,
        clientCollectionId: item.id,
        requiredDocumentId: targetDoc?.id || null,
        originalFileName: file.name,
        storageKey: saved.storageKey,
        mimeType: file.type,
        size: saved.size,
        uploadedByName: uploadedByName || null,
        uploaderComment: uploaderComment || null
      }
    });
  }

  if (targetDoc) {
    await prisma.requiredDocument.update({
      where: { id: targetDoc.id },
      data: { status: "RECEIVED" }
    });
  }

  await recalculateClientCollectionStatus(item.id);
  return NextResponse.json({ ok: true });
}
