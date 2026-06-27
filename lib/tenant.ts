import { prisma } from "@/lib/prisma";

export class TenantAccessError extends Error {
  constructor(message = "Ressource introuvable.") {
    super(message);
    this.name = "TenantAccessError";
  }
}

export async function requireFirmClient(firmId: string, clientId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, firmId } });
  if (!client) throw new TenantAccessError("Client introuvable.");
  return client;
}

export async function requireFirmCollection(firmId: string, collectionId: string) {
  const collection = await prisma.collectionPeriod.findFirst({ where: { id: collectionId, firmId } });
  if (!collection) throw new TenantAccessError("Collecte introuvable.");
  return collection;
}

export async function requireFirmClientCollection(firmId: string, clientCollectionId: string) {
  const clientCollection = await prisma.clientCollection.findFirst({ where: { id: clientCollectionId, firmId } });
  if (!clientCollection) throw new TenantAccessError("Dossier introuvable.");
  return clientCollection;
}

export async function requireFirmDocument(firmId: string, documentId: string) {
  const document = await prisma.uploadedDocument.findFirst({ where: { id: documentId, firmId } });
  if (!document) throw new TenantAccessError("Document introuvable.");
  return document;
}

export async function requireFirmRequiredDocument(firmId: string, requiredDocumentId: string) {
  const document = await prisma.requiredDocument.findFirst({ where: { id: requiredDocumentId, firmId } });
  if (!document) throw new TenantAccessError("Document requis introuvable.");
  return document;
}
