import { NextResponse } from "next/server";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvEscape } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireFirmUser();
  const { id } = await params;
  const clientCollection = await prisma.clientCollection.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      client: true,
      collectionPeriod: true,
      tvaAmountEntries: {
        include: { uploadedDocument: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!clientCollection) {
    return new NextResponse("Introuvable", { status: 404 });
  }

  const rows = [
    [
      "Client",
      "Période",
      "Type",
      "Numero facture",
      "Date facture",
      "Fournisseur/Client",
      "HT",
      "TVA",
      "TTC",
      "Taux TVA",
      "Nom fichier document",
      "Document ID",
      "Notes"
    ],
    ...clientCollection.tvaAmountEntries.map((entry) => [
      clientCollection.client.companyName,
      `${clientCollection.collectionPeriod.month}/${clientCollection.collectionPeriod.year}`,
      entry.type,
      entry.invoiceNumber || "",
      entry.invoiceDate ? entry.invoiceDate.toISOString().slice(0, 10) : "",
      entry.supplierOrCustomerName || "",
      entry.amountHT,
      entry.amountTVA,
      entry.amountTTC,
      entry.tvaRate,
      entry.uploadedDocument?.originalFileName || "",
      entry.uploadedDocumentId || "",
      entry.notes || ""
    ])
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const fileName = `tva-entries-${clientCollection.client.companyName.replaceAll(/\s+/g, "-").toLowerCase()}-${clientCollection.collectionPeriod.month}-${clientCollection.collectionPeriod.year}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
