"use server";

import { RequiredDocumentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { defaultRequiredDocuments } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { saveLocalUpload, validateUpload } from "@/lib/storage";
import { generateUploadToken, recalculateClientCollectionStatus } from "@/lib/tva";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function createClientAction(formData: FormData) {
  const user = await requireUser();
  const companyName = text(formData, "companyName");
  if (!companyName) return;

  await prisma.client.create({
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
  if (!name || !month || !year) return;
  const collection = await prisma.collectionPeriod.create({
    data: { firmId: user.firmId, name, month, year, status: "ACTIVE" }
  });
  revalidatePath("/app/collections");
  redirect(`/app/collections/${collection.id}`);
}

export async function addClientsToCollectionAction(collectionId: string, formData: FormData) {
  const user = await requireUser();
  const ids = formData.getAll("clientIds").filter((value): value is string => typeof value === "string");
  const collection = await prisma.collectionPeriod.findFirst({ where: { id: collectionId, firmId: user.firmId } });
  if (!collection) return;

  for (const clientId of ids) {
    const client = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId } });
    if (!client) continue;
    await prisma.clientCollection.upsert({
      where: { clientId_collectionPeriodId: { clientId, collectionPeriodId: collectionId } },
      update: {},
      create: {
        firmId: user.firmId,
        clientId,
        collectionPeriodId: collectionId,
        uploadToken: generateUploadToken(),
        requiredDocuments: {
          create: defaultRequiredDocuments.map((name) => ({ firmId: user.firmId, name, isRequired: true }))
        }
      }
    });
  }
  revalidatePath(`/app/collections/${collectionId}`);
}

export async function markRequiredDocumentAction(requiredDocumentId: string, status: RequiredDocumentStatus) {
  const user = await requireUser();
  const doc = await prisma.requiredDocument.findFirst({
    where: { id: requiredDocumentId, firmId: user.firmId },
    select: { clientCollectionId: true }
  });
  if (!doc) return;
  await prisma.requiredDocument.update({ where: { id: requiredDocumentId }, data: { status } });
  await recalculateClientCollectionStatus(doc.clientCollectionId);
  revalidatePath("/app/collections");
}

export async function markClientCollectionCompleteAction(clientCollectionId: string) {
  const user = await requireUser();
  await prisma.clientCollection.updateMany({
    where: { id: clientCollectionId, firmId: user.firmId },
    data: { status: "COMPLETE" }
  });
  revalidatePath("/app/collections");
}

export async function uploadDocumentsAction(token: string, formData: FormData) {
  const item = await prisma.clientCollection.findUnique({
    where: { uploadToken: token },
    include: { collectionPeriod: true, requiredDocuments: true }
  });
  if (!item || item.collectionPeriod.status === "CLOSED") return { error: "Lien indisponible." };

  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return { error: "Ajoutez au moins un fichier." };

  const requiredDocumentId = text(formData, "requiredDocumentId");
  const targetDoc = requiredDocumentId ? item.requiredDocuments.find((doc) => doc.id === requiredDocumentId) : null;

  for (const file of files) {
    const error = validateUpload(file);
    if (error) return { error };
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
        uploadedByName: text(formData, "uploadedByName"),
        uploaderComment: text(formData, "uploaderComment")
      }
    });
  }
  if (targetDoc) {
    await prisma.requiredDocument.update({ where: { id: targetDoc.id }, data: { status: "RECEIVED" } });
  }
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
      defaultRequiredDocuments: docs.length ? docs : defaultRequiredDocuments,
      reminderTemplate: text(formData, "reminderTemplate")
    }
  });
  revalidatePath("/app/settings");
}
