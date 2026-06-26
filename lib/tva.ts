import { ClientCollectionStatus, RequiredDocumentStatus, ReminderChannel } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { monthNames } from "@/lib/constants";
import { uploadUrl } from "@/lib/utils";

type ReminderInput = {
  clientName: string;
  firmName: string;
  month: number;
  year: number;
  uploadToken: string;
  missingDocuments: string[];
};

export function generateUploadToken() {
  return `cl_${randomUUID().replaceAll("-", "")}${randomUUID().slice(0, 8)}`;
}

export function statusLabel(status: ClientCollectionStatus) {
  return {
    NOT_STARTED: "Non commence",
    IN_PROGRESS: "En cours",
    MISSING: "Documents manquants",
    COMPLETE: "Dossier complet"
  }[status];
}

export function collectionStatusLabel(status: string) {
  return {
    DRAFT: "Brouillon",
    ACTIVE: "Active",
    CLOSED: "Fermee"
  }[status] || status;
}

export function generateReminderMessage(input: ReminderInput, channel: ReminderChannel = "WHATSAPP") {
  const missing = input.missingDocuments.length
    ? input.missingDocuments.map((name) => `- ${name}`).join("\n")
    : "- Aucun document manquant";
  const monthYear = `${monthNames[input.month - 1]} ${input.year}`;
  const link = uploadUrl(input.uploadToken);

  if (channel === "EMAIL") {
    return `Bonjour ${input.clientName},\n\nPetit rappel pour la TVA ${monthYear}.\n\nIl nous manque encore les documents suivants :\n\n${missing}\n\nMerci de les deposer ici :\n${link}\n\nCordialement,\nCabinet ${input.firmName}`;
  }

  return `Bonjour ${input.clientName},\n\nPetit rappel pour la TVA ${monthYear}.\n\nIl nous manque encore les documents suivants :\n\n${missing}\n\nMerci de les deposer ici :\n${link}\n\nCabinet ${input.firmName}`;
}

export async function recalculateClientCollectionStatus(clientCollectionId: string) {
  const clientCollection = await prisma.clientCollection.findUnique({
    where: { id: clientCollectionId },
    include: {
      requiredDocuments: true,
      uploadedDocuments: true
    }
  });

  if (!clientCollection) return null;

  const uploads = clientCollection.uploadedDocuments.length;
  const requiredDocs = clientCollection.requiredDocuments.filter((doc) => doc.isRequired);
  const missingRequired = requiredDocs.filter((doc) => doc.status === RequiredDocumentStatus.MISSING);
  const unclassifiedUploads = clientCollection.uploadedDocuments.some((doc) => !doc.requiredDocumentId);

  let status: ClientCollectionStatus = ClientCollectionStatus.NOT_STARTED;
  if (uploads === 0) status = ClientCollectionStatus.NOT_STARTED;
  else if (missingRequired.length === 0) status = ClientCollectionStatus.COMPLETE;
  else if (unclassifiedUploads) status = ClientCollectionStatus.IN_PROGRESS;
  else status = ClientCollectionStatus.MISSING;

  return prisma.clientCollection.update({
    where: { id: clientCollectionId },
    data: { status }
  });
}

export function missingDocuments(requiredDocuments: { name: string; status: RequiredDocumentStatus; isRequired: boolean }[]) {
  return requiredDocuments
    .filter((doc) => doc.isRequired && doc.status === RequiredDocumentStatus.MISSING)
    .map((doc) => doc.name);
}

export function receivedDocuments(requiredDocuments: { name: string; status: RequiredDocumentStatus }[]) {
  return requiredDocuments.filter((doc) => doc.status === RequiredDocumentStatus.RECEIVED).map((doc) => doc.name);
}
