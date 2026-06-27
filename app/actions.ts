"use server";

import { CollectionStatus, DocumentQualityStatus, OperationalActorType, RequiredDocumentStatus, WorkflowType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { clientCompletionConfirmationText, clientUploadProofText, requiredDocumentsFromFirm, workflowTemplateFromType } from "@/lib/constants";
import { recordOperationalEvent } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { saveLocalUpload, validateUpload } from "@/lib/storage";
import { generateUploadToken, recalculateClientCollectionStatus } from "@/lib/tva";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? Number(value) : null;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

function requiredDocumentsForWorkflow(workflowType: WorkflowType, firmDefaultDocuments: unknown) {
  if (workflowType === WorkflowType.TVA_MONTHLY || workflowType === WorkflowType.TVA_QUARTERLY) {
    return requiredDocumentsFromFirm(firmDefaultDocuments);
  }
  return [...workflowTemplateFromType(workflowType).documents];
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  await requireAdmin();
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      stage: text(formData, "stage") || "NEW",
      nextFollowUpAt: dateValue(formData, "nextFollowUpAt"),
      assignedOwner: text(formData, "assignedOwner"),
      expectedPlan: text(formData, "expectedPlan"),
      expectedSetupFee: numberValue(formData, "expectedSetupFee"),
      notes: text(formData, "notes")
    }
  });
  revalidatePath("/admin/leads");
}

export async function createClientAction(formData: FormData) {
  const user = await requireUser();
  const companyName = text(formData, "companyName");
  if (!companyName) return;

  const client = await prisma.client.create({
    data: {
      firmId: user.firmId,
      companyName,
      contactName: text(formData, "contactName"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      ice: text(formData, "ice"),
      taxId: text(formData, "taxId"),
      city: text(formData, "city"),
      notes: text(formData, "notes")
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: client.id,
    eventType: "CLIENT_CREATED",
    eventTitle: "Client cree",
    eventDescription: `${client.companyName} a ete ajoute au cabinet.`,
    metadata: { companyName: client.companyName, city: client.city },
    source: "APP_CLIENTS"
  });
  revalidatePath("/app/clients");
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const user = await requireUser();
  const companyName = text(formData, "companyName");
  if (!companyName) return;
  await prisma.client.updateMany({
    where: { id: clientId, firmId: user.firmId },
    data: {
      companyName,
      contactName: text(formData, "contactName"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      ice: text(formData, "ice"),
      taxId: text(formData, "taxId"),
      city: text(formData, "city"),
      notes: text(formData, "notes")
    }
  });
  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath("/app/clients");
}

export async function deleteClientAction(clientId: string) {
  const user = await requireUser();
  const active = await prisma.clientCollection.count({
    where: { clientId, firmId: user.firmId, collectionPeriod: { status: "ACTIVE" } }
  });
  if (active === 0) {
    await prisma.client.deleteMany({ where: { id: clientId, firmId: user.firmId } });
  }
  revalidatePath("/app/clients");
  redirect("/app/clients");
}

export async function createCollectionAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name");
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const requestedWorkflowType = text(formData, "workflowType");
  const workflowType =
    requestedWorkflowType && requestedWorkflowType in WorkflowType ? (requestedWorkflowType as WorkflowType) : WorkflowType.TVA_MONTHLY;
  const clientIds = formData.getAll("clientIds").filter((value): value is string => typeof value === "string");
  if (!name || !month || !year) return;
  const collection = await prisma.collectionPeriod.create({
    data: { firmId: user.firmId, name, month, year, workflowType, status: "ACTIVE" }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    collectionId: collection.id,
    eventType: "COLLECTION_CREATED",
    eventTitle: "Collecte creee",
    eventDescription: `${collection.name} a ete creee.`,
    metadata: { name: collection.name, month: collection.month, year: collection.year, workflowType },
    source: "APP_COLLECTIONS"
  });

  if (clientIds.length) {
    const clients = await prisma.client.findMany({ where: { id: { in: clientIds }, firmId: user.firmId } });
    const requiredDocuments = requiredDocumentsForWorkflow(workflowType, user.firm.defaultRequiredDocuments);
    for (const client of clients) {
      const clientCollection = await prisma.clientCollection.upsert({
        where: { clientId_collectionPeriodId: { clientId: client.id, collectionPeriodId: collection.id } },
        update: {},
        create: {
          firmId: user.firmId,
          clientId: client.id,
          collectionPeriodId: collection.id,
          uploadToken: generateUploadToken(),
          requiredDocuments: {
            create: requiredDocuments.map((docName) => ({ firmId: user.firmId, name: docName, isRequired: true }))
          }
        }
      });
      await recordOperationalEvent({
        firmId: user.firmId,
        actorUserId: user.id,
        actorType: OperationalActorType.USER,
        clientId: client.id,
        collectionId: collection.id,
        clientCollectionId: clientCollection.id,
        eventType: "UPLOAD_LINK_GENERATED",
        eventTitle: "Lien de depot genere",
        eventDescription: `Lien de depot genere pour ${client.companyName}.`,
        metadata: { requiredDocuments },
        source: "APP_COLLECTIONS"
      });
    }
  }

  revalidatePath("/app/collections");
  redirect(`/app/collections/${collection.id}`);
}

export async function addClientsToCollectionAction(collectionId: string, formData: FormData) {
  const user = await requireUser();
  const ids = formData.getAll("clientIds").filter((value): value is string => typeof value === "string");
  const collection = await prisma.collectionPeriod.findFirst({ where: { id: collectionId, firmId: user.firmId } });
  if (!collection) return;
  const requiredDocuments = requiredDocumentsForWorkflow(collection.workflowType, user.firm.defaultRequiredDocuments);

  for (const clientId of ids) {
    const client = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId } });
    if (!client) continue;
    const clientCollection = await prisma.clientCollection.upsert({
      where: { clientId_collectionPeriodId: { clientId, collectionPeriodId: collectionId } },
      update: {},
      create: {
        firmId: user.firmId,
        clientId,
        collectionPeriodId: collectionId,
        uploadToken: generateUploadToken(),
        requiredDocuments: {
          create: requiredDocuments.map((name) => ({ firmId: user.firmId, name, isRequired: true }))
        }
      }
    });
    await recordOperationalEvent({
      firmId: user.firmId,
      actorUserId: user.id,
      actorType: OperationalActorType.USER,
      clientId,
      collectionId,
      clientCollectionId: clientCollection.id,
      eventType: "UPLOAD_LINK_GENERATED",
      eventTitle: "Lien de depot genere",
      eventDescription: `Lien de depot genere pour ${client.companyName}.`,
      metadata: { requiredDocuments },
      source: "APP_COLLECTION_DETAIL"
    });
  }
  revalidatePath(`/app/collections/${collectionId}`);
}

export async function markRequiredDocumentAction(requiredDocumentId: string, status: RequiredDocumentStatus) {
  const user = await requireUser();
  const doc = await prisma.requiredDocument.findFirst({
    where: { id: requiredDocumentId, firmId: user.firmId },
    select: { name: true, clientCollectionId: true, clientCollection: { select: { clientId: true, collectionPeriodId: true } } }
  });
  if (!doc) return;
  await prisma.requiredDocument.update({ where: { id: requiredDocumentId }, data: { status } });
  await recalculateClientCollectionStatus(doc.clientCollectionId);
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: doc.clientCollection.clientId,
    collectionId: doc.clientCollection.collectionPeriodId,
    clientCollectionId: doc.clientCollectionId,
    obligationId: requiredDocumentId,
    eventType: "DOCUMENT_REVIEWED",
    eventTitle: "Document requis mis a jour",
    eventDescription: `${doc.name} marque ${status}.`,
    metadata: { requiredDocumentName: doc.name, status },
    source: "APP_COLLECTION_DETAIL"
  });
  revalidatePath("/app/collections");
}

export async function markClientCollectionCompleteAction(clientCollectionId: string) {
  const user = await requireUser();
  const item = await prisma.clientCollection.findFirst({
    where: { id: clientCollectionId, firmId: user.firmId },
    select: { clientId: true, collectionPeriodId: true }
  });
  if (!item) return;
  await prisma.clientCollection.updateMany({
    where: { id: clientCollectionId, firmId: user.firmId },
    data: { status: "COMPLETE" }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId,
    eventType: "CLIENT_COLLECTION_COMPLETED",
    eventTitle: "Dossier client marque complet",
    eventDescription: "Le dossier client a ete marque complet.",
    source: "APP_COLLECTION_DETAIL"
  });
  revalidatePath("/app/collections");
}

export async function updateCollectionStatusAction(collectionId: string, status: CollectionStatus) {
  const user = await requireUser();
  await prisma.collectionPeriod.updateMany({
    where: { id: collectionId, firmId: user.firmId },
    data: { status }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    collectionId,
    eventType: status === CollectionStatus.CLOSED ? "COLLECTION_CLOSED" : status === CollectionStatus.ACTIVE ? "COLLECTION_REOPENED" : "COLLECTION_STATUS_UPDATED",
    eventTitle: "Statut collecte mis a jour",
    eventDescription: `Statut mis a jour: ${status}.`,
    metadata: { status },
    source: "APP_COLLECTION_DETAIL"
  });
  revalidatePath("/app/collections");
  revalidatePath(`/app/collections/${collectionId}`);
}

export async function classifyUploadedDocumentAction(documentId: string, formData: FormData) {
  const user = await requireUser();
  const requiredDocumentId = text(formData, "requiredDocumentId");
  const document = await prisma.uploadedDocument.findFirst({
    where: { id: documentId, firmId: user.firmId },
    include: { clientCollection: { include: { requiredDocuments: true } } }
  });
  if (!document) return;

  const targetDoc = requiredDocumentId
    ? document.clientCollection.requiredDocuments.find((doc) => doc.id === requiredDocumentId)
    : null;

  await prisma.uploadedDocument.update({
    where: { id: document.id },
    data: { requiredDocumentId: targetDoc?.id || null }
  });

  if (targetDoc) {
    await prisma.requiredDocument.update({
      where: { id: targetDoc.id },
      data: { status: RequiredDocumentStatus.RECEIVED }
    });
  }

  await recalculateClientCollectionStatus(document.clientCollectionId);
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: document.clientCollection.clientId,
    collectionId: document.clientCollection.collectionPeriodId,
    clientCollectionId: document.clientCollectionId,
    obligationId: targetDoc?.id || null,
    documentId: document.id,
    eventType: "DOCUMENT_REVIEWED",
    eventTitle: "Document classe",
    eventDescription: targetDoc ? `Document classe comme ${targetDoc.name}.` : "Document laisse non classe.",
    metadata: { requiredDocumentId: targetDoc?.id || null, requiredDocumentName: targetDoc?.name || null },
    source: "APP_DOCUMENTS"
  });
  revalidatePath("/app/documents");
  revalidatePath(`/app/collections/${document.clientCollection.collectionPeriodId}`);
}

export async function updateUploadedDocumentQualityAction(documentId: string, formData: FormData) {
  const user = await requireUser();
  const status = formData.get("qualityStatus");
  if (typeof status !== "string" || !Object.values(DocumentQualityStatus).includes(status as DocumentQualityStatus)) return;
  const document = await prisma.uploadedDocument.findFirst({
    where: { id: documentId, firmId: user.firmId },
    select: { clientCollectionId: true, originalFileName: true, clientCollection: { select: { clientId: true, collectionPeriodId: true } } }
  });
  if (!document) return;

  await prisma.uploadedDocument.update({
    where: { id: documentId },
    data: {
      qualityStatus: status as DocumentQualityStatus,
      accountantComment: text(formData, "accountantComment")
    }
  });
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    clientId: document.clientCollection.clientId,
    collectionId: document.clientCollection.collectionPeriodId,
    clientCollectionId: document.clientCollectionId,
    documentId,
    eventType: status === DocumentQualityStatus.VALID ? "DOCUMENT_REVIEWED" : "DOCUMENT_REJECTED",
    eventTitle: status === DocumentQualityStatus.VALID ? "Document valide" : "Document rejete",
    eventDescription: `${document.originalFileName}: ${status}.`,
    metadata: { qualityStatus: status, accountantComment: text(formData, "accountantComment") },
    source: "APP_DOCUMENTS"
  });

  revalidatePath("/app/documents");
  revalidatePath(`/app/collections/${document.clientCollection.collectionPeriodId}`);
}

export async function updateClientCollectionNotesAction(clientCollectionId: string, formData: FormData) {
  const user = await requireUser();
  const item = await prisma.clientCollection.findFirst({
    where: { id: clientCollectionId, firmId: user.firmId },
    select: { collectionPeriodId: true }
  });
  if (!item) return;
  await prisma.clientCollection.update({
    where: { id: clientCollectionId },
    data: { accountantNotes: text(formData, "accountantNotes") }
  });
  revalidatePath(`/app/collections/${item.collectionPeriodId}`);
}

export async function uploadDocumentsAction(token: string, formData: FormData) {
  const item = await prisma.clientCollection.findUnique({
    where: { uploadToken: token },
    include: { collectionPeriod: true, requiredDocuments: true }
  });
  if (!item || item.collectionPeriod.status !== "ACTIVE") return { error: "Lien indisponible." };
  if (formData.get("clientAcknowledgement") !== "yes") {
    return { error: "Veuillez confirmer que les documents manquants ou en retard peuvent retarder le traitement." };
  }
  if (formData.get("clientPeriodConfirmation") !== "yes") {
    return { error: "Veuillez confirmer que les documents concernent bien la periode selectionnee." };
  }
  if (formData.get("clientCompletionConfirmation") !== "yes") {
    return { error: "Veuillez confirmer avoir envoye tous les documents disponibles pour cette periode." };
  }
  await recordOperationalEvent({
    firmId: item.firmId,
    actorType: OperationalActorType.CLIENT,
    clientId: item.clientId,
    collectionId: item.collectionPeriodId,
    clientCollectionId: item.id,
    eventType: "CLIENT_ACCEPTED_RULES",
    eventTitle: "Regles acceptees par le client",
    eventDescription: "Le client a confirme les consequences de retard, la periode et l'envoi des documents disponibles.",
    metadata: { acceptedText: clientUploadProofText, completionConfirmationText: clientCompletionConfirmationText },
    source: "PUBLIC_UPLOAD_FORM"
  });

  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return { error: "Ajoutez au moins un fichier." };

  const requiredDocumentId = text(formData, "requiredDocumentId");
  const targetDoc = requiredDocumentId ? item.requiredDocuments.find((doc) => doc.id === requiredDocumentId) : null;

  for (const file of files) {
    const error = validateUpload(file);
    if (error) return { error };
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
        uploadedByName: text(formData, "uploadedByName"),
        uploaderComment: text(formData, "uploaderComment")
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
      source: "PUBLIC_UPLOAD_FORM"
    });
  }
  if (targetDoc) {
    await prisma.requiredDocument.update({ where: { id: targetDoc.id }, data: { status: "RECEIVED" } });
  }
  await prisma.clientCollection.update({
    where: { id: item.id },
    data: {
      completionConfirmedAt: new Date(),
      completionConfirmationText: clientCompletionConfirmationText
    }
  });
  await recalculateClientCollectionStatus(item.id);
  revalidatePath(`/upload/${token}`);
  return { ok: true };
}

export async function updateSettingsAction(formData: FormData) {
  const user = await requireUser();
  const docs = String(formData.get("defaultRequiredDocuments") || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  await prisma.firm.update({
    where: { id: user.firmId },
    data: {
      name: text(formData, "name") || user.firm.name,
      city: text(formData, "city"),
      phone: text(formData, "phone"),
      email: text(formData, "email"),
      logoUrl: text(formData, "logoUrl"),
      defaultRequiredDocuments: requiredDocumentsFromFirm(docs),
      reminderTemplate: text(formData, "reminderTemplate")
    }
  });
  revalidatePath("/app/settings");
}
