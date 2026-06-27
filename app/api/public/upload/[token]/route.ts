import { OperationalActorType } from "@prisma/client";
import { NextResponse } from "next/server";
import { clientUploadProofText } from "@/lib/constants";
import { recordOperationalEvent, requestEventContext } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { saveLocalUpload, validateUpload } from "@/lib/storage";
import { recalculateClientCollectionStatus } from "@/lib/tva";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
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
  if (item) {
    await recordOperationalEvent({
      firmId: item.firmId,
      actorType: OperationalActorType.CLIENT,
      clientId: item.clientId,
      collectionId: item.collectionPeriodId,
      clientCollectionId: item.id,
      eventType: "CLIENT_OPENED_LINK",
      eventTitle: "Lien de depot ouvert",
      eventDescription: `${item.client.companyName} a ouvert le lien de depot.`,
      metadata: { collectionStatus: item.collectionPeriod.status, via: "api" },
      ...requestEventContext(request),
      source: "PUBLIC_UPLOAD_API"
    });
  }
  if (!item || item.collectionPeriod.status !== "ACTIVE") {
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
  if (!item || item.collectionPeriod.status !== "ACTIVE") {
    return NextResponse.json({ error: "Lien de depot indisponible." }, { status: 404 });
  }

  const formData = await request.formData();
  const uploadedByName = String(formData.get("uploadedByName") || "");
  const uploaderComment = String(formData.get("uploaderComment") || "");
  const requiredDocumentId = String(formData.get("requiredDocumentId") || "");
  const clientAcknowledgement = String(formData.get("clientAcknowledgement") || "");
  const clientPeriodConfirmation = String(formData.get("clientPeriodConfirmation") || "");
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

  if (clientAcknowledgement !== "yes") {
    return NextResponse.json({ error: "Veuillez confirmer que les documents manquants ou en retard peuvent retarder le traitement." }, { status: 400 });
  }
  if (clientPeriodConfirmation !== "yes") {
    return NextResponse.json({ error: "Veuillez confirmer que les documents concernent bien la periode selectionnee." }, { status: 400 });
  }
  const requestContext = requestEventContext(request);
  await recordOperationalEvent({
    firmId: item.firmId,
    actorType: OperationalActorType.CLIENT,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId: item.id,
    eventType: "CLIENT_ACCEPTED_RULES",
    eventTitle: "Regles acceptees par le client",
    eventDescription: "Le client a confirme les consequences de retard et la periode des documents.",
    metadata: { acceptedText: clientUploadProofText },
    ...requestContext,
    source: "PUBLIC_UPLOAD_API"
  });

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
    const document = await prisma.uploadedDocument.create({
      data: {
        firmId: item.firmId,
        clientCollectionId: item.id,
        requiredDocumentId: targetDoc?.id || null,
        originalFileName: file.name,
        storageKey: saved.storageKey,
        mimeType: file.type,
        size: saved.size,
        clientAcknowledgedDelayRisk: true,
        clientAcknowledgedAt: new Date(),
        clientAcknowledgementText: clientUploadProofText,
        uploadedByName: uploadedByName || null,
        uploaderComment: uploaderComment || null
      }
    });
    await recordOperationalEvent({
      firmId: item.firmId,
      actorType: OperationalActorType.CLIENT,
      clientId: item.clientId,
      collectionId: item.collectionPeriodId,
      clientCollectionId: item.id,
      obligationId: targetDoc?.id || null,
      documentId: document.id,
      eventType: "DOCUMENT_UPLOADED",
      eventTitle: "Document depose",
      eventDescription: `${file.name} depose par le client.`,
      metadata: {
        originalFileName: file.name,
        size: saved.size,
        mimeType: file.type,
        requiredDocumentId: targetDoc?.id || null,
        requiredDocumentName: targetDoc?.name || null
      },
      ...requestContext,
      source: "PUBLIC_UPLOAD_API"
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
