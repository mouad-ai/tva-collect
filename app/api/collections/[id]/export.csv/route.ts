import { OperationalActorType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireFirmUser } from "@/lib/auth";
import { recordOperationalEvent, requestEventContext } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { csvEscape, formatDate, uploadUrl } from "@/lib/utils";
import { missingDocuments, receivedDocuments, statusLabel } from "@/lib/tva";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  const collection = await prisma.collectionPeriod.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      clientCollections: {
        include: {
          client: true,
          requiredDocuments: true,
          uploadedDocuments: { orderBy: { createdAt: "desc" } },
          reminderLogs: { orderBy: { createdAt: "desc" }, take: 1 }
        },
        orderBy: { client: { companyName: "asc" } }
      }
    }
  });
  if (!collection) return NextResponse.json({ error: "Collecte introuvable." }, { status: 404 });

  const headers = [
    "Société client",
    "Nom contact",
    "Téléphone",
    "Email",
    "ICE",
    "Statut",
    "Documents manquants",
    "Documents reçus",
    "Date derniere relance",
    "Date dernier dépôt",
    "Lien dépôt"
  ];
  const rows = collection.clientCollections.map((item) => [
    item.client.companyName,
    item.client.contactName,
    item.client.phone,
    item.client.email,
    item.client.ice,
    statusLabel(item.status),
    missingDocuments(item.requiredDocuments).join(", "),
    receivedDocuments(item.requiredDocuments).join(", "),
    formatDate(item.reminderLogs[0]?.createdAt),
    formatDate(item.uploadedDocuments[0]?.createdAt),
    uploadUrl(item.uploadToken)
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  await recordOperationalEvent({
    firmId: user.firmId,
    actorUserId: user.id,
    actorType: OperationalActorType.USER,
    collectionId: collection.id,
    eventType: "COLLECTION_REPORT_EXPORTED",
    eventTitle: "Rapport CSV exporte",
    eventDescription: `Export CSV généré pour ${collection.name}.`,
    metadata: { collectionName: collection.name, rows: rows.length },
    ...requestEventContext(request),
    source: "APP_REPORTS"
  });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${collection.name.replaceAll(" ", "_")}.csv"`
    }
  });
}
