import { DocumentSecurityScanStatus, FirmStatus, PrismaClient, RequiredDocumentStatus, ScannerProvider, SubscriptionStatus, UserRole } from "@prisma/client";
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
  await prisma.documentSecurityScan.deleteMany();
  await prisma.uploadedDocument.deleteMany();
  await prisma.requiredDocument.deleteMany();
  await prisma.clientCollection.deleteMany();
  await prisma.collectionPeriod.deleteMany();
  await prisma.client.deleteMany();
  await prisma.userInvite.deleteMany();
  await prisma.user.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.billingEvent.deleteMany();
  await prisma.billingReceipt.deleteMany();
  await prisma.paymentProof.deleteMany();
  await prisma.billingInvoice.deleteMany();
  await prisma.firmSubscription.deleteMany();
  await prisma.firm.deleteMany();

  const firm = await prisma.firm.create({
    data: {
      name: "Cabinet Demo Casablanca",
      city: "Casablanca",
      phone: "+212 522 00 00 00",
      email: "contact@cabinet-demo.ma",
      status: FirmStatus.ACTIVE,
      plan: "PRO",
      trialStartDate: new Date("2026-06-01"),
      trialEndDate: new Date("2026-07-01"),
      defaultRequiredDocuments: defaultDocs,
      reminderTemplate:
        "Bonjour [Client],\n\nPetit rappel pour la TVA [Month Year].\n\nIl nous manque encore les documents suivants :\n\n[Missing documents]\n\nMerci de les deposer ici :\n[Upload Link]\n\nCabinet [Firm Name]"
    }
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { code: "PRO" },
    update: {},
    create: {
      id: "plan_pro",
      code: "PRO",
      name: "Pro",
      monthlyPriceMad: 1999,
      clientLimit: 100,
      userLimit: 3,
      storageLimitMb: 20480,
      hasZipExport: true,
      hasAdvancedReports: true
    }
  });

  await prisma.firmSubscription.create({
    data: {
      firmId: firm.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startedAt: new Date("2026-06-01"),
      trialEndsAt: new Date("2026-07-01"),
      currentPeriodStart: new Date("2026-06-01"),
      currentPeriodEnd: new Date("2026-07-01")
    }
  });

  await prisma.user.create({
    data: {
      name: "SaaS Admin",
      email: "demo@tvacollect.ma",
      passwordHash: await bcrypt.hash("password123", 10),
      role: UserRole.ADMIN
    }
  });

  await prisma.user.create({
    data: {
      name: "Owner Cabinet Demo",
      email: "owner@cabinet-demo.ma",
      passwordHash: await bcrypt.hash("password123", 10),
      role: UserRole.OWNER,
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
        uploadTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
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
      const uploadedDocument = await prisma.uploadedDocument.create({
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
      await prisma.documentSecurityScan.create({
        data: {
          firmId: firm.id,
          documentId: uploadedDocument.id,
          status: DocumentSecurityScanStatus.CLEAN,
          scannerProvider: ScannerProvider.NONE,
          details: "Seed document marked clean.",
          scannedAt: new Date()
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
