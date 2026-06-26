import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvEscape, formatDate, uploadUrl } from "@/lib/utils";
import { missingDocuments, receivedDocuments, statusLabel } from "@/lib/tva";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const collection = await prisma.collectionPeriod.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      clientCollections: {
        include: {
          client: true,
          requiredDocuments: true,
          uploadedDocuments: { orderBy: { createdAt: "desc" } }
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
    "Status",
    "Missing documents",
    "Received documents",
    "Last upload date",
    "Upload link"
  ];
  const rows = collection.clientCollections.map((item) => [
    item.client.companyName,
    item.client.contactName,
    item.client.phone,
    item.client.email,
    statusLabel(item.status),
    missingDocuments(item.requiredDocuments).join(", "),
    receivedDocuments(item.requiredDocuments).join(", "),
    formatDate(item.uploadedDocuments[0]?.createdAt),
    uploadUrl(item.uploadToken)
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${collection.name.replaceAll(" ", "_")}.csv"`
    }
  });
}
