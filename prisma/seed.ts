import { PrismaClient, RequiredDocumentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const defaultDocs = [
  "Factures d'achat",
  "Factures de vente",
  "Releve bancaire",
  "Justificatifs de caisse",
  "Notes de frais",
  "Avoirs",
  "Autres documents TVA"
];

async function main() {
  await prisma.reminderLog.deleteMany();
  await prisma.uploadedDocument.deleteMany();
  await prisma.requiredDocument.deleteMany();
  await prisma.clientCollection.deleteMany();
  await prisma.collectionPeriod.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.firm.deleteMany();

  const firm = await prisma.firm.create({
    data: {
      name: "Cabinet Demo Casablanca",
      city: "Casablanca",
      phone: "+212 522 00 00 00",
      email: "contact@cabinet-demo.ma",
      defaultRequiredDocuments: defaultDocs,
      reminderTemplate:
        "Bonjour [Client],\n\nPetit rappel pour la TVA [Month Year].\n\nIl nous manque encore les documents suivants :\n\n[Missing documents]\n\nMerci de les deposer ici :\n[Upload Link]\n\nCabinet [Firm Name]"
    }
  });

  await prisma.user.create({
    data: {
      name: "Demo TVA Collect",
      email: "demo@tvacollect.ma",
      passwordHash: await bcrypt.hash("password123", 10),
      firmId: firm.id
    }
  });

  const clients = await Promise.all(
    [
      ["SARL Atlas Services", "Karim Bennani", "karim@atlas.ma", "+212 661 11 11 11", "Casablanca"],
      ["Cafe Al Amal", "Nadia El Fassi", "contact@alamal.ma", "+212 662 22 22 22", "Rabat"],
      ["Garage Mecanique Pro", "Youssef Amrani", "garage@pro.ma", "+212 663 33 33 33", "Casablanca"],
      ["Pharmacie Al Wifaq", "Samira Alaoui", "pharma@wifaq.ma", "+212 664 44 44 44", "Mohammedia"],
      ["Ecole Les Orangers", "Meryem Tazi", "admin@orangers.ma", "+212 665 55 55 55", "Casablanca"]
    ].map(([companyName, contactName, email, phone, city], index) =>
      prisma.client.create({
        data: {
          firmId: firm.id,
          companyName,
          contactName,
          email,
          phone,
          city,
          ice: `00112233445${index}`,
          taxId: `IF-2026-${index + 1}`,
          notes: index === 1 ? "Prefere WhatsApp pour les relances." : null
        }
      })
    )
  );

  const period = await prisma.collectionPeriod.create({
    data: {
      firmId: firm.id,
      name: "TVA Juin 2026",
      month: 6,
      year: 2026,
      status: "ACTIVE"
    }
  });

  const uploadDir = path.join(process.cwd(), "uploads", "seed");
  await mkdir(uploadDir, { recursive: true });

  for (const [index, client] of clients.entries()) {
    const status = index === 0 || index === 3 ? "COMPLETE" : index === 4 ? "NOT_STARTED" : "MISSING";
    const clientCollection = await prisma.clientCollection.create({
      data: {
        firmId: firm.id,
        clientId: client.id,
        collectionPeriodId: period.id,
        uploadToken: `cl_demo_${index}_${randomUUID().replaceAll("-", "")}`,
        status
      }
    });

    const docs = await Promise.all(
      defaultDocs.map((name, docIndex) => {
        const received =
          status === "COMPLETE" || (status === "MISSING" && (docIndex === 0 || docIndex === 2));
        return prisma.requiredDocument.create({
          data: {
            firmId: firm.id,
            clientCollectionId: clientCollection.id,
            name,
            isRequired: true,
            status: received ? RequiredDocumentStatus.RECEIVED : RequiredDocumentStatus.MISSING
          }
        });
      })
    );

    for (const doc of docs.filter((d) => d.status === "RECEIVED").slice(0, 3)) {
      const fileName = `${client.companyName.replaceAll(" ", "_")}_${doc.name.replaceAll(" ", "_")}.pdf`;
      const storageKey = path.join("seed", fileName);
      await writeFile(path.join(process.cwd(), "uploads", storageKey), `%PDF-1.4\nDemo file for ${doc.name}\n`);
      await prisma.uploadedDocument.create({
        data: {
          firmId: firm.id,
          clientCollectionId: clientCollection.id,
          requiredDocumentId: doc.id,
          originalFileName: fileName,
          storageKey,
          mimeType: "application/pdf",
          size: 34,
          uploadedByName: client.contactName,
          uploaderComment: "Document demo ajoute au seed."
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
