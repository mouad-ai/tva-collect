import { OperationalActorType } from "@prisma/client";
import { NextResponse } from "next/server";
import { clientUploadProofText } from "@/lib/constants";
import { logServerError, publicError } from "@/lib/error-logging";
import { createCleanLocalScan } from "@/lib/file-security";
import { recordOperationalEvent, requestEventContext } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitIp } from "@/lib/rate-limit";
import { saveLocalUpload, validateUpload } from "@/lib/storage";
import { recalculateClientCollectionStatus } from "@/lib/tva";

function unavailableStatus(item: {
  firm?: { status: string };
  collectionPeriod: { status: string };
  isLocked: boolean;
  uploadTokenDisabledAt: Date | null;
  uploadTokenExpiresAt: Date | null;
  deletedAt?: Date | null;
}) {
  if (item.firm?.status === "SUSPENDED" || item.firm?.status === "CANCELLED") {
    return "Ce portail est temporairement indisponible. Merci de contacter votre cabinet.";
  }
  if (item.deletedAt) return "Lien de dépôt indisponible.";
  if (item.collectionPeriod.status !== "ACTIVE") return "Lien de dépôt indisponible.";
  if (item.isLocked) return "Période verrouillee. Contactez votre cabinet avant tout nouveau dépôt.";
  if (item.uploadTokenDisabledAt) return "Ce lien de dépôt a été desactive. Contactez votre cabinet.";
  if (item.uploadTokenExpiresAt && item.uploadTokenExpiresAt < new Date()) return "Ce lien de dépôt a expire. Contactez votre cabinet pour recevoir un nouveau lien.";
  return null;
}

async function handleGET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await prisma.clientCollection.findFirst({
    where: { uploadToken: token, deletedAt: null },
    include: {
      firm: true,
      client: true,
      collectionPeriod: true,
      requiredDocuments: { orderBy: { createdAt: "asc" } },
      uploadedDocuments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } }
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
      eventTitle: "Lien de dépôt ouvert",
      eventDescription: `${item.client.companyName} a ouvert le lien de dépôt.`,
      metadata: { collectionStatus: item.collectionPeriod.status, via: "api" },
      ...requestEventContext(request),
      source: "PUBLIC_UPLOAD_API"
    });
  }
  if (!item) {
    return NextResponse.json({ error: "Lien de dépôt indisponible." }, { status: 404 });
  }
  const unavailable = unavailableStatus(item);
  if (unavailable) return NextResponse.json({ error: unavailable }, { status: 404 });
  return NextResponse.json({
    firm: {
      name: item.firm.name,
      logoUrl: item.firm.logoUrl,
      phone: item.firm.phone,
      email: item.firm.email
    },
    client: {
      companyName: item.client.companyName
    },
    period: {
      name: item.collectionPeriod.name,
      month: item.collectionPeriod.month,
      year: item.collectionPeriod.year,
      status: item.collectionPeriod.status
    },
    requestedDocuments: item.requiredDocuments.map((document) => ({
      name: document.name,
      description: document.description,
      isRequired: document.isRequired,
      status: document.status
    })),
    uploadStatus: item.status
  });
}

async function handlePOST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await prisma.clientCollection.findFirst({
    where: { uploadToken: token, deletedAt: null },
    include: { firm: true, collectionPeriod: true, requiredDocuments: true }
  });
  if (!item) {
    return NextResponse.json({ error: "Lien de dépôt indisponible." }, { status: 404 });
  }
  const unavailable = unavailableStatus(item);
  if (unavailable) return NextResponse.json({ error: unavailable }, { status: 403 });
  const ip = rateLimitIp(request);
  const [tokenLimit, ipLimit] = await Promise.all([
    rateLimit({ key: `upload:token:${token}`, limit: 20, windowMs: 15 * 60 * 1000 }),
    rateLimit({ key: `upload:ip:${ip}`, limit: 40, windowMs: 15 * 60 * 1000 })
  ]);
  if (!tokenLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Trop de tentatives. Veuillez patienter avant de reessayer." }, { status: 429 });
  }

  const formData = await request.formData();
  const uploadedByName = String(formData.get("uploadedByName") || "");
  const uploaderComment = String(formData.get("uploaderComment") || "");
  const requiredDocumentName = String(formData.get("requiredDocumentName") || "");
  const clientAcknowledgement = String(formData.get("clientAcknowledgement") || "");
  const clientPeriodConfirmation = String(formData.get("clientPeriodConfirmation") || "");
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

  if (clientAcknowledgement !== "yes") {
    return NextResponse.json({ error: "Veuillez confirmer que les documents manquants ou en retard peuvent retarder le traitement." }, { status: 400 });
  }
  if (clientPeriodConfirmation !== "yes") {
    return NextResponse.json({ error: "Veuillez confirmer que les documents concernent bien la période selectionnee." }, { status: 400 });
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
    eventDescription: "Le client a confirme les consequences de retard et la période des documents.",
    metadata: { acceptedText: clientUploadProofText },
    ...requestContext,
    source: "PUBLIC_UPLOAD_API"
  });

  if (files.length === 0) {
    return NextResponse.json({ error: "Ajoutez au moins un fichier." }, { status: 400 });
  }

  const targetDoc = requiredDocumentName
    ? item.requiredDocuments.find((doc) => doc.name === requiredDocumentName)
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
    await createCleanLocalScan(document.id, item.firmId);
    await recordOperationalEvent({
      firmId: item.firmId,
      actorType: OperationalActorType.CLIENT,
      clientId: item.clientId,
      collectionId: item.collectionPeriodId,
      clientCollectionId: item.id,
      obligationId: targetDoc?.id || null,
      documentId: document.id,
      eventType: "DOCUMENT_UPLOADED",
      eventTitle: "Document dépose",
      eventDescription: `${file.name} dépose par le client.`,
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

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    return await handleGET(request, context);
  } catch (error) {
    const reference = await logServerError({ error, request });
    return NextResponse.json(publicError(reference), { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    return await handlePOST(request, context);
  } catch (error) {
    const reference = await logServerError({ error, request });
    return NextResponse.json(publicError(reference), { status: 500 });
  }
}
