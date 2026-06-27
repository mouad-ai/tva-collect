import { OperationalActorType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { recordOperationalEvent, requestEventContext } from "@/lib/operational-events";
import { prisma } from "@/lib/prisma";
import { csvEscape, formatDate, uploadUrl } from "@/lib/utils";
import { missingDocuments, receivedDocuments, statusLabel } from "@/lib/tva";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
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
    "Client company",
    "Contact name",
    "Phone",
    "Email",
    "ICE",
    "Status",
    "Missing documents",
    "Received documents",
    "Last reminder date",
    "Last upload date",
    "Upload link"
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
    eventDescription: `Export CSV genere pour ${collection.name}.`,
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
