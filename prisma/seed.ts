/**
 * TVA Collect demo/pilot seed script.
 *
 * Creates realistic (but entirely fictional) Moroccan demo data for sales
 * demos and pilot walkthroughs: a demo cabinet with clients, TVA collection
 * periods, documents in every status (missing/received/pending/validated/
 * rejected), reminder history, a second trial-status firm for admin-list
 * variety, and a few demo leads.
 *
 * SAFETY
 * - Refuses to run unless ALLOW_DEMO_SEED=true is set explicitly.
 * - Refuses to run with NODE_ENV=production unless CONFIRM_PRODUCTION_SEED=true
 *   is ALSO set (a real demo/pilot box may legitimately run with
 *   NODE_ENV=production — this is a second, deliberate confirmation).
 * - Never hardcodes a password. DEMO_PASSWORD must be set in the environment
 *   and must pass the same strength check used for real accounts.
 * - Only deletes data belonging to ITS OWN demo firms (matched by the fixed
 *   demo owner emails below) and demo leads (matched by leadSource). It never
 *   touches any other firm, user, or lead — safe to run against a database
 *   that also holds real pilot cabinets.
 * - Re-running this script is the supported way to reset the demo account:
 *   it removes the previous demo firms (cascade-deletes their clients,
 *   collections, documents, reminders, invites, subscription...) and
 *   recreates them fresh.
 *
 * USAGE
 *   ALLOW_DEMO_SEED=true DEMO_PASSWORD='Choose-A-Strong-One-1!' npx prisma db seed
 */
import {
    DocumentQualityStatus,
    DocumentSecurityScanStatus,
    FirmStatus,
    OperationalActorType,
    PrismaClient,
    RequiredDocumentStatus,
    ReminderChannel,
    ScannerProvider,
    SubscriptionStatus,
    UserRole
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { clientUploadProofText, defaultRequiredDocuments, monthNames } from "../lib/constants";
import { generateInviteToken, inviteExpiresAt, passwordStrengthError } from "../lib/invites";
import { recordOperationalEvent } from "../lib/operational-events";
import { saveLocalUpload } from "../lib/storage";
import { generateReminderMessage, generateUploadToken, recalculateClientCollectionStatus, uploadTokenExpiryDate } from "../lib/tva";

const prisma = new PrismaClient();

const DEMO_OWNER_EMAIL = "demo@tvacollect.com";
const DEMO_ASSISTANT_EMAIL = "assistant-demo@tvacollect.com";
const DEMO_PENDING_INVITE_EMAIL = "invite-demo@tvacollect.com";
const DEMO_TRIAL_OWNER_EMAIL = "essai@tvacollect.com";
const DEMO_LEAD_SOURCE = "DEMO_SEED";

function fail(message: string): never {
    console.error(`\n[seed-demo] ${message}\n`);
    process.exit(1);
}

function requireDemoPassword() {
    const password = process.env.DEMO_PASSWORD;
    if (!password) {
        fail(
            "DEMO_PASSWORD is required and must not be hardcoded.\n" +
            "  Example: ALLOW_DEMO_SEED=true DEMO_PASSWORD='Choose-A-Strong-One-1!' npx prisma db seed"
        );
    }
    const strengthError = passwordStrengthError(password);
    if (strengthError) fail(`DEMO_PASSWORD is not strong enough: ${strengthError}`);
    return password;
}

function safeDbTarget() {
    try {
        const url = new URL(process.env.DATABASE_URL || "");
        return `${url.hostname}${url.pathname}`;
    } catch {
        return "(DATABASE_URL not parseable)";
    }
}

async function makeDemoFile(fileName: string, label: string) {
    return new File([Buffer.from(`%PDF-1.4\nDemo document — ${label}\nTVA Collect demo data, not a real document.\n`)], fileName, {
        type: "application/pdf"
    });
}

async function resetPreviousDemoData() {
    const previousDemoUsers = await prisma.user.findMany({
        where: { email: { in: [DEMO_OWNER_EMAIL, DEMO_TRIAL_OWNER_EMAIL] } },
        select: { firmId: true }
    });
    const firmIds = [...new Set(previousDemoUsers.map((user) => user.firmId).filter((id): id is string => Boolean(id)))];
    if (firmIds.length) {
        // Deleting the Firm cascades to its users, clients, collections, required
        // and uploaded documents, reminders, invites, and subscription records —
        // see the onDelete: Cascade relations in prisma/schema.prisma.
        await prisma.firm.deleteMany({ where: { id: { in: firmIds } } });
        console.log(`[seed-demo] Removed ${firmIds.length} previous demo firm(s) before reseeding.`);
    }
    const { count } = await prisma.lead.deleteMany({ where: { leadSource: DEMO_LEAD_SOURCE } });
    if (count) console.log(`[seed-demo] Removed ${count} previous demo lead(s).`);
}

type DocOutcome = "MISSING" | "VALID" | "PENDING" | "REJECTED_UNREADABLE" | "REJECTED_WRONG" | "REJECTED_THEN_VALID";

type ClientSeed = {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    city: string;
    ice: string;
    taxId: string;
    notes?: string | null;
    docOutcomes: DocOutcome[];
    reminder?: { channel: ReminderChannel; daysAgo: number };
};

const clientSeeds: ClientSeed[] = [
    {
        companyName: "SARL Atlas Négoce",
        contactName: "Omar Benjelloun",
        email: "omar.benjelloun@atlas-negoce.ma",
        phone: "0661020304",
        city: "Casablanca",
        ice: "001234567000045",
        taxId: "IF-48213",
        docOutcomes: ["VALID", "VALID", "VALID", "VALID", "VALID", "VALID", "VALID"]
    },
    {
        companyName: "Café Renaissance",
        contactName: "Nadia El Fassi",
        email: "nadia.elfassi@cafe-renaissance.ma",
        phone: "0662030405",
        city: "Rabat",
        ice: "001234567000052",
        taxId: "IF-51902",
        notes: "Préfère WhatsApp pour les relances.",
        docOutcomes: ["VALID", "VALID", "MISSING", "MISSING", "MISSING", "MISSING", "MISSING"],
        reminder: { channel: ReminderChannel.WHATSAPP, daysAgo: 2 }
    },
    {
        companyName: "Garage Meknassi",
        contactName: "Youssef Amrani",
        email: "youssef.amrani@garage-meknassi.ma",
        phone: "0663040506",
        city: "Meknès",
        ice: "001234567000069",
        taxId: "IF-33517",
        docOutcomes: ["VALID", "VALID", "VALID", "REJECTED_UNREADABLE", "MISSING", "MISSING", "MISSING"]
    },
    {
        companyName: "Pharmacie Ibn Sina",
        contactName: "Samira Alaoui",
        email: "samira.alaoui@pharma-ibnsina.ma",
        phone: "0664050607",
        city: "Mohammedia",
        ice: "001234567000076",
        taxId: "IF-27649",
        docOutcomes: ["VALID", "VALID", "PENDING", "PENDING", "MISSING", "MISSING", "MISSING"]
    },
    {
        companyName: "École Les Orangers",
        contactName: "Meryem Tazi",
        email: "meryem.tazi@ecole-orangers.ma",
        phone: "0665060708",
        city: "Casablanca",
        ice: "001234567000083",
        taxId: "IF-61284",
        docOutcomes: ["MISSING", "MISSING", "MISSING", "MISSING", "MISSING", "MISSING", "MISSING"]
    },
    {
        companyName: "Boulangerie Al Baraka",
        contactName: "Rachid Idrissi",
        email: "rachid.idrissi@boulangerie-albaraka.ma",
        phone: "0666070809",
        city: "Marrakech",
        ice: "001234567000090",
        taxId: "IF-39475",
        docOutcomes: ["VALID", "VALID", "VALID", "VALID", "REJECTED_THEN_VALID", "MISSING", "MISSING"],
        reminder: { channel: ReminderChannel.EMAIL, daysAgo: 5 }
    },
    {
        companyName: "Import Export Sahara",
        contactName: "Fatima Zahra Ouahbi",
        email: "fz.ouahbi@sahara-import.ma",
        phone: "0667080910",
        city: "Tanger",
        ice: "001234567000106",
        taxId: "IF-42918",
        docOutcomes: ["VALID", "MISSING", "MISSING", "MISSING", "MISSING", "MISSING", "MISSING"],
        reminder: { channel: ReminderChannel.WHATSAPP, daysAgo: 6 }
    },
    {
        companyName: "BTP Chaouia Travaux",
        contactName: "Abdellah Berrada",
        email: "a.berrada@chaouia-btp.ma",
        phone: "0668091011",
        city: "Settat",
        ice: "001234567000113",
        taxId: "IF-55603",
        docOutcomes: ["VALID", "VALID", "VALID", "VALID", "VALID", "VALID", "VALID"]
    }
];

const rejectionReasons: Record<"REJECTED_UNREADABLE" | "REJECTED_WRONG" | "REJECTED_THEN_VALID", string> = {
    REJECTED_UNREADABLE: "Photo floue et illisible. Merci de rescanner ou reprendre la photo avec plus de lumière.",
    REJECTED_WRONG: "Ce document ne correspond pas à la pièce demandée. Merci de vérifier et déposer le bon document.",
    REJECTED_THEN_VALID: "Document incomplet (page manquante). Merci de déposer la version complète."
};

async function main() {
    if (process.env.ALLOW_DEMO_SEED !== "true") {
        fail(
            "Refusing to run: this script resets demo data.\n" +
            "  Set ALLOW_DEMO_SEED=true to confirm, e.g.:\n" +
            "  ALLOW_DEMO_SEED=true DEMO_PASSWORD='...' npx prisma db seed"
        );
    }
    if (process.env.NODE_ENV === "production" && process.env.CONFIRM_PRODUCTION_SEED !== "true") {
        fail(
            "NODE_ENV=production detected. Refusing to seed demo data without a second confirmation.\n" +
            "  If this is really a dedicated demo/pilot deployment, also set CONFIRM_PRODUCTION_SEED=true."
        );
    }
    const demoPassword = requireDemoPassword();
    console.log(`[seed-demo] Target database: ${safeDbTarget()}`);

    await resetPreviousDemoData();

    const defaultDocs = [...defaultRequiredDocuments];
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    const now = new Date();

    // --- Main demo cabinet -----------------------------------------------
    const firm = await prisma.firm.create({
        data: {
            name: "Fiduciaire Atlas Conseil",
            city: "Casablanca",
            phone: "0522451230",
            email: "contact@atlas-conseil.ma",
            status: FirmStatus.ACTIVE,
            plan: "PRO",
            defaultRequiredDocuments: defaultDocs,
            reminderTemplate:
                "Bonjour [Client],\n\nPetit rappel pour la TVA [Month Year].\n\nIl nous manque encore les documents suivants :\n\n[Missing documents]\n\nMerci de les déposer ici :\n[Upload Link]\n\nCabinet [Firm Name]"
        }
    });

    const proPlan = await prisma.subscriptionPlan.upsert({
        where: { code: "PRO" },
        update: {},
        create: {
            id: "plan_pro",
            code: "PRO",
            name: "Professionnel",
            monthlyPriceMad: 249,
            clientLimit: 75,
            userLimit: 3,
            storageLimitMb: 10240,
            hasZipExport: true,
            hasAdvancedReports: true
        }
    });

    await prisma.firmSubscription.create({
        data: {
            firmId: firm.id,
            planId: proPlan.id,
            status: SubscriptionStatus.ACTIVE,
            startedAt: new Date(now.getFullYear(), now.getMonth() - 2, 1),
            currentPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1),
            currentPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        }
    });

    const owner = await prisma.user.create({
        data: {
            name: "Yasmine Idrissi",
            email: DEMO_OWNER_EMAIL,
            passwordHash,
            role: UserRole.OWNER,
            firmId: firm.id,
            isActive: true
        }
    });

    await prisma.user.create({
        data: {
            name: "Karim Ouazzani",
            email: DEMO_ASSISTANT_EMAIL,
            passwordHash,
            role: UserRole.ASSISTANT,
            firmId: firm.id,
            isActive: true
        }
    });

    // A pending (not yet accepted) invite so the team/onboarding flow has
    // something real to show, not just an empty invite list.
    const { tokenHash } = generateInviteToken();
    await prisma.userInvite.create({
        data: {
            firmId: firm.id,
            email: DEMO_PENDING_INVITE_EMAIL,
            name: "Salma Bennis",
            role: UserRole.MANAGER,
            tokenHash,
            expiresAt: inviteExpiresAt(7),
            createdByUserId: owner.id
        }
    });

    // --- Second firm: fresh trial signup, for admin-list variety ---------
    const trialFirm = await prisma.firm.create({
        data: {
            name: "Cabinet Zniber Conseil",
            city: "Rabat",
            phone: "0537204510",
            email: "contact@zniber-conseil.ma",
            status: FirmStatus.TRIAL,
            plan: "STARTER",
            trialStartDate: now,
            trialEndDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            defaultRequiredDocuments: defaultDocs
        }
    });
    await prisma.user.create({
        data: {
            name: "Hassan Zniber",
            email: DEMO_TRIAL_OWNER_EMAIL,
            passwordHash,
            role: UserRole.OWNER,
            firmId: trialFirm.id,
            isActive: true
        }
    });

    // --- Clients -----------------------------------------------------------
    const clients = await Promise.all(
        clientSeeds.map((seed) =>
            prisma.client.create({
                data: {
                    firmId: firm.id,
                    companyName: seed.companyName,
                    contactName: seed.contactName,
                    email: seed.email,
                    phone: seed.phone,
                    city: seed.city,
                    ice: seed.ice,
                    taxId: seed.taxId,
                    notes: seed.notes || null
                }
            })
        )
    );

    // --- Collection periods: current (active) + previous (closed/clean) ---
    const activePeriod = await prisma.collectionPeriod.create({
        data: {
            firmId: firm.id,
            name: `TVA ${monthNames[now.getMonth()]} ${now.getFullYear()}`,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            status: "ACTIVE"
        }
    });
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const closedPeriod = await prisma.collectionPeriod.create({
        data: {
            firmId: firm.id,
            name: `TVA ${monthNames[previous.getMonth()]} ${previous.getFullYear()}`,
            month: previous.getMonth() + 1,
            year: previous.getFullYear(),
            status: "CLOSED"
        }
    });

    // --- Active period: rich, varied statuses -------------------------------
    for (const [index, client] of clients.entries()) {
        const seed = clientSeeds[index];
        const clientCollection = await prisma.clientCollection.create({
            data: {
                firmId: firm.id,
                clientId: client.id,
                collectionPeriodId: activePeriod.id,
                uploadToken: generateUploadToken(),
                uploadTokenExpiresAt: uploadTokenExpiryDate(now)
            }
        });

        await recordOperationalEvent({
            firmId: firm.id,
            actorType: OperationalActorType.CLIENT,
            clientId: client.id,
            collectionId: activePeriod.id,
            clientCollectionId: clientCollection.id,
            eventType: "CLIENT_OPENED_LINK",
            eventTitle: "Lien de dépôt ouvert",
            eventDescription: `${client.companyName} a ouvert le lien de dépôt.`,
            source: "DEMO_SEED"
        });

        for (const [docIndex, docName] of defaultDocs.entries()) {
            const outcome = seed.docOutcomes[docIndex] || "MISSING";
            const requiredDoc = await prisma.requiredDocument.create({
                data: {
                    firmId: firm.id,
                    clientCollectionId: clientCollection.id,
                    name: docName,
                    isRequired: true,
                    status: outcome === "MISSING" ? RequiredDocumentStatus.MISSING : RequiredDocumentStatus.RECEIVED
                }
            });

            if (outcome === "MISSING") continue;

            async function upload(qualityStatus: DocumentQualityStatus, daysAgo: number, comment?: string) {
                const fileName = `${client.companyName.replaceAll(" ", "_")}_${docName.replaceAll(" ", "_")}_${daysAgo}.pdf`;
                const file = await makeDemoFile(fileName, `${client.companyName} — ${docName}`);
                const saved = await saveLocalUpload(file, clientCollection.id);
                const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
                const uploadedDocument = await prisma.uploadedDocument.create({
                    data: {
                        firmId: firm.id,
                        clientCollectionId: clientCollection.id,
                        requiredDocumentId: requiredDoc.id,
                        originalFileName: fileName,
                        storageKey: saved.storageKey,
                        mimeType: "application/pdf",
                        size: saved.size,
                        qualityStatus,
                        accountantComment: comment || null,
                        clientAcknowledgedDelayRisk: true,
                        clientAcknowledgedAt: createdAt,
                        clientAcknowledgementText: clientUploadProofText,
                        uploadedByName: seed.contactName,
                        createdAt
                    }
                });
                await prisma.documentSecurityScan.create({
                    data: {
                        firmId: firm.id,
                        documentId: uploadedDocument.id,
                        status: DocumentSecurityScanStatus.CLEAN,
                        scannerProvider: ScannerProvider.NONE,
                        details: "Demo document marked clean.",
                        scannedAt: createdAt
                    }
                });
                await recordOperationalEvent({
                    firmId: firm.id,
                    actorType: OperationalActorType.CLIENT,
                    clientId: client.id,
                    collectionId: activePeriod.id,
                    clientCollectionId: clientCollection.id,
                    obligationId: requiredDoc.id,
                    documentId: uploadedDocument.id,
                    eventType: "DOCUMENT_UPLOADED",
                    eventTitle: "Document déposé",
                    eventDescription: `${fileName} déposé par ${seed.contactName}.`,
                    source: "DEMO_SEED"
                });
                if (qualityStatus !== DocumentQualityStatus.UNREVIEWED) {
                    await recordOperationalEvent({
                        firmId: firm.id,
                        actorUserId: owner.id,
                        actorType: OperationalActorType.USER,
                        clientId: client.id,
                        collectionId: activePeriod.id,
                        clientCollectionId: clientCollection.id,
                        documentId: uploadedDocument.id,
                        eventType: qualityStatus === DocumentQualityStatus.VALID ? "DOCUMENT_REVIEWED" : "DOCUMENT_REJECTED",
                        eventTitle: qualityStatus === DocumentQualityStatus.VALID ? "Document validé" : "Document rejeté",
                        eventDescription: `${fileName}: ${qualityStatus}.`,
                        metadata: { qualityStatus, accountantComment: comment || null },
                        source: "DEMO_SEED"
                    });
                }
                return uploadedDocument;
            }

            if (outcome === "VALID") {
                await upload(DocumentQualityStatus.VALID, 3);
            } else if (outcome === "PENDING") {
                await upload(DocumentQualityStatus.UNREVIEWED, 1);
            } else if (outcome === "REJECTED_UNREADABLE") {
                await upload(DocumentQualityStatus.UNREADABLE, 2, rejectionReasons.REJECTED_UNREADABLE);
            } else if (outcome === "REJECTED_WRONG") {
                await upload(DocumentQualityStatus.WRONG_DOCUMENT, 2, rejectionReasons.REJECTED_WRONG);
            } else if (outcome === "REJECTED_THEN_VALID") {
                await upload(DocumentQualityStatus.MISSING_PAGE, 6, rejectionReasons.REJECTED_THEN_VALID);
                await upload(DocumentQualityStatus.VALID, 1);
            }
        }

        if (seed.reminder) {
            const requiredDocs = await prisma.requiredDocument.findMany({ where: { clientCollectionId: clientCollection.id } });
            const message = generateReminderMessage(
                {
                    clientName: seed.contactName,
                    firmName: firm.name,
                    month: activePeriod.month,
                    year: activePeriod.year,
                    uploadToken: clientCollection.uploadToken,
                    missingDocuments: requiredDocs.filter((doc) => doc.status === RequiredDocumentStatus.MISSING).map((doc) => doc.name)
                },
                seed.reminder.channel
            );
            const reminderCreatedAt = new Date(now.getTime() - seed.reminder.daysAgo * 24 * 60 * 60 * 1000);
            const reminderLog = await prisma.reminderLog.create({
                data: {
                    firmId: firm.id,
                    clientCollectionId: clientCollection.id,
                    channel: seed.reminder.channel,
                    message,
                    createdAt: reminderCreatedAt
                }
            });
            await recordOperationalEvent({
                firmId: firm.id,
                actorUserId: owner.id,
                actorType: OperationalActorType.USER,
                clientId: client.id,
                collectionId: activePeriod.id,
                clientCollectionId: clientCollection.id,
                eventType: "REMINDER_GENERATED",
                eventTitle: "Relance générée",
                eventDescription: `Relance ${seed.reminder.channel} générée pour ${client.companyName}.`,
                metadata: { reminderId: reminderLog.id, channel: seed.reminder.channel },
                source: "DEMO_SEED"
            });
        }

        await recalculateClientCollectionStatus(clientCollection.id);
    }

    // --- Closed period: clean, fully completed history ----------------------
    for (const [index, client] of clients.entries()) {
        const clientCollection = await prisma.clientCollection.create({
            data: {
                firmId: firm.id,
                clientId: client.id,
                collectionPeriodId: closedPeriod.id,
                uploadToken: generateUploadToken(),
                uploadTokenExpiresAt: uploadTokenExpiryDate(previous),
                completionConfirmedAt: new Date(previous.getFullYear(), previous.getMonth(), 18)
            }
        });
        for (const docName of defaultDocs) {
            const requiredDoc = await prisma.requiredDocument.create({
                data: {
                    firmId: firm.id,
                    clientCollectionId: clientCollection.id,
                    name: docName,
                    isRequired: true,
                    status: RequiredDocumentStatus.RECEIVED
                }
            });
            const fileName = `${client.companyName.replaceAll(" ", "_")}_${docName.replaceAll(" ", "_")}_archive.pdf`;
            const file = await makeDemoFile(fileName, `${client.companyName} — ${docName} (période clôturée)`);
            const saved = await saveLocalUpload(file, clientCollection.id);
            const createdAt = new Date(previous.getFullYear(), previous.getMonth(), 15 + (index % 5));
            const uploadedDocument = await prisma.uploadedDocument.create({
                data: {
                    firmId: firm.id,
                    clientCollectionId: clientCollection.id,
                    requiredDocumentId: requiredDoc.id,
                    originalFileName: fileName,
                    storageKey: saved.storageKey,
                    mimeType: "application/pdf",
                    size: saved.size,
                    qualityStatus: DocumentQualityStatus.VALID,
                    clientAcknowledgedDelayRisk: true,
                    clientAcknowledgedAt: createdAt,
                    clientAcknowledgementText: clientUploadProofText,
                    uploadedByName: client.contactName,
                    createdAt
                }
            });
            await prisma.documentSecurityScan.create({
                data: {
                    firmId: firm.id,
                    documentId: uploadedDocument.id,
                    status: DocumentSecurityScanStatus.CLEAN,
                    scannerProvider: ScannerProvider.NONE,
                    details: "Demo document marked clean.",
                    scannedAt: createdAt
                }
            });
        }
        await recalculateClientCollectionStatus(clientCollection.id);
    }

    // --- Demo leads, for the admin pipeline view ----------------------------
    const demoLeads: Array<{
        name: string;
        firmName: string;
        phone: string;
        email: string;
        city: string;
        numberOfClients: number;
        stage: string;
        painLevel: string;
        currentWorkflow: string;
        biggestProblem: string;
    }> = [
        {
            name: "Nabil Cherkaoui",
            firmName: "Cabinet Cherkaoui & Fils",
            phone: "0669101112",
            email: "nabil@cherkaoui-cabinet.ma",
            city: "Fès",
            numberOfClients: 45,
            stage: "NEW",
            painLevel: "HIGH",
            currentWorkflow: "WhatsApp et Excel",
            biggestProblem: "On perd des documents dans les groupes WhatsApp clients."
        },
        {
            name: "Imane Sekkat",
            firmName: "Sekkat Comptabilité",
            phone: "0669111213",
            email: "imane@sekkat-compta.ma",
            city: "Agadir",
            numberOfClients: 28,
            stage: "DEMO_SCHEDULED",
            painLevel: "MEDIUM",
            currentWorkflow: "Email et Drive",
            biggestProblem: "Relances manuelles chronophages chaque fin de mois."
        },
        {
            name: "Othmane Rifai",
            firmName: "Rifai Fiduciaire",
            phone: "0669121314",
            email: "othmane@rifai-fiduciaire.ma",
            city: "Oujda",
            numberOfClients: 60,
            stage: "CONTACTED",
            painLevel: "HIGH",
            currentWorkflow: "WhatsApp uniquement",
            biggestProblem: "Impossible de savoir qui a envoyé quoi sans tout relire."
        }
    ];
    for (const lead of demoLeads) {
        await prisma.lead.create({
            data: {
                name: lead.name,
                firmName: lead.firmName,
                phone: lead.phone,
                email: lead.email,
                city: lead.city,
                numberOfClients: lead.numberOfClients,
                currentWorkflow: lead.currentWorkflow,
                painLevel: lead.painLevel,
                leadSource: DEMO_LEAD_SOURCE,
                stage: lead.stage,
                biggestProblem: lead.biggestProblem
            }
        });
    }

    console.log("\n[seed-demo] Done.\n");
    console.log(`  Cabinet owner login : ${DEMO_OWNER_EMAIL}`);
    console.log(`  Assistant login     : ${DEMO_ASSISTANT_EMAIL}`);
    console.log(`  Trial cabinet owner : ${DEMO_TRIAL_OWNER_EMAIL}`);
    console.log("  Password for all of the above: the DEMO_PASSWORD you set for this run.\n");
    console.log("  Create/verify a platform ADMIN account separately with: npm run create-admin\n");
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
