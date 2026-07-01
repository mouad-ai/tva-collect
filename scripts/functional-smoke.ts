import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const checks: Check[] = [];

function check(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });
}

async function login(email: string, password: string) {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const setCookie = response.headers.get("set-cookie") || "";
  const data = await response.json();
  return { response, cookie: setCookie.split(";")[0], redirectTo: data.redirectTo as string };
}

async function authed(cookie: string, path: string, init?: RequestInit) {
  return request(path, {
    ...init,
    headers: {
      cookie,
      ...(init?.headers || {})
    }
  });
}

async function jsonAuthed(cookie: string, path: string, body: unknown, method = "POST") {
  return authed(cookie, path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function main() {
  const stamp = Date.now();
  const health = await request("/api/health");
  check("health", health.ok, `${health.status}`);

  const admin = await login("demo@tvacollect.ma", "password123");
  check("admin-login", admin.response.ok && admin.redirectTo === "/admin", `${admin.response.status} ${admin.redirectTo}`);

  const owner = await login("owner@cabinet-demo.ma", "password123");
  check("owner-login", owner.response.ok && owner.redirectTo === "/app", `${owner.response.status} ${owner.redirectTo}`);

  const publicRoutes = ["/", "/pricing", "/contact", "/demo", "/privacy", "/terms", "/login", "/forgot-password"];
  for (const route of publicRoutes) {
    const response = await request(route);
    check(`public:${route}`, response.ok, `${response.status}`);
  }

  const adminRoutes = ["/admin", "/admin/firms", "/admin/firms/new", "/admin/users", "/admin/invites", "/admin/events", "/admin/leads", "/admin/release-checklist"];
  for (const route of adminRoutes) {
    const response = await authed(admin.cookie, route);
    check(`admin:${route}`, response.ok, `${response.status}`);
  }

  const appRoutes = [
    "/app",
    "/app/clients",
    "/app/collections",
    "/app/documents",
    "/app/reminders",
    "/app/reports",
    "/app/settings",
    "/app/settings/team",
    "/app/settings/fiscal-config",
    "/app/help",
    "/app/billing",
    "/app/search",
    "/app/notifications",
    "/app/proof-vault",
    "/app/trash",
    "/app/tva-readiness",
    "/app/tva-filing",
    "/app/tva-risk-register",
    "/app/tva-portfolio-exposure",
    "/app/fiscal-audits",
    "/app/work-queue"
  ];
  for (const route of appRoutes) {
    const response = await authed(owner.cookie, route);
    check(`app:${route}`, response.ok, `${response.status}`);
  }

  const ids = await prisma.clientCollection.findFirst({
    where: { deletedAt: null, collectionPeriod: { status: "ACTIVE" }, isLocked: false, uploadTokenDisabledAt: null },
    select: {
      id: true,
      uploadToken: true,
      status: true,
      collectionPeriodId: true,
      clientId: true,
      uploadedDocuments: { where: { deletedAt: null }, select: { id: true }, take: 1 }
    }
  });
  const client = await prisma.client.findFirst({ where: { deletedAt: null }, select: { id: true } });
  const collection = await prisma.collectionPeriod.findFirst({ where: { deletedAt: null }, select: { id: true } });
  const document = await prisma.uploadedDocument.findFirst({ where: { deletedAt: null }, select: { id: true } });

  if (!ids || !client || !collection || !document) throw new Error("Seed data missing for functional smoke test.");

  const uploadPage = await request(`/upload/${ids.uploadToken}`);
  check("public-upload-page", uploadPage.ok, `${uploadPage.status}`);

  const apiRoutes = [
    "/api/clients",
    `/api/clients/${client.id}`,
    "/api/collections",
    `/api/collections/${collection.id}`,
    `/api/collections/${collection.id}/export.csv`,
    "/api/documents",
    `/api/documents/${document.id}/download`,
    `/api/client-collections/${ids.id}/tva-entries.csv`
  ];
  for (const route of apiRoutes) {
    const response = await authed(owner.cookie, route);
    check(`api:${route}`, response.ok, `${response.status}`);
  }

  const smokeClientName = `ZZ Smoke Client ${stamp}`;
  const createClient = await jsonAuthed(owner.cookie, "/api/clients", {
    companyName: smokeClientName,
    contactName: "QA",
    email: `qa${stamp}@example.com`,
    phone: "+212600000000",
    city: "Casablanca",
    ice: `SMOKE${stamp}`
  });
  const createdClient = await createClient.json();
  check("client-create-api", createClient.status === 201 && Boolean(createdClient.id), `${createClient.status}`);

  const updateClient = await jsonAuthed(owner.cookie, `/api/clients/${createdClient.id}`, {
    companyName: `${smokeClientName} Updated`,
    contactName: "QA",
    email: `qa${stamp}@example.com`,
    phone: "+212600000001",
    city: "Rabat",
    ice: `SMOKE${stamp}`
  }, "PUT");
  check("client-update-api", updateClient.ok, `${updateClient.status}`);

  const deleteClient = await authed(owner.cookie, `/api/clients/${createdClient.id}`, { method: "DELETE" });
  check("client-soft-delete-api", deleteClient.ok, `${deleteClient.status}`);

  const importClient = await jsonAuthed(owner.cookie, "/api/clients/import", {
    rows: [{
      companyName: `ZZ Import Smoke ${stamp}`,
      contactName: "Import QA",
      email: `import${stamp}@example.com`,
      phone: "+212600000002",
      city: "Fes",
      ice: `IMPORT${stamp}`
    }]
  });
  const importResult = await importClient.json();
  check("client-import-api", importClient.ok && importResult.created === 1, `${importClient.status} created=${importResult.created}`);

  const reminder = await jsonAuthed(owner.cookie, `/api/client-collections/${ids.id}/reminders`, { channel: "WHATSAPP" });
  const reminderResult = await reminder.json();
  check("reminder-generate-api", reminder.ok && Boolean(reminderResult.message), `${reminder.status}`);

  const leadForm = new FormData();
  leadForm.set("name", "Lead Smoke");
  leadForm.set("firmName", "Smoke Cabinet");
  leadForm.set("phone", "+212600000003");
  leadForm.set("email", `lead${stamp}@example.com`);
  leadForm.set("city", "Casa");
  leadForm.set("numberOfClients", "10");
  leadForm.set("numberOfAssistants", "1");
  leadForm.set("leadSource", "SMOKE");
  const contact = await request("/api/contact", { method: "POST", body: leadForm });
  check("contact-lead-api", contact.status === 303, `${contact.status}`);

  const fileForm = new FormData();
  const fileName = `tva-functional-smoke-${stamp}.pdf`;
  fileForm.set("uploadedByName", "Functional Smoke");
  fileForm.set("uploaderComment", "Automated functional smoke test");
  fileForm.set("clientAcknowledgement", "yes");
  fileForm.set("clientPeriodConfirmation", "yes");
  fileForm.append("files", new Blob([`%PDF-1.4\nFunctional smoke upload ${stamp}\n`], { type: "application/pdf" }), fileName);
  const upload = await request(`/api/public/upload/${ids.uploadToken}`, { method: "POST", body: fileForm });
  check("public-upload-post", upload.ok, `${upload.status}`);

  await prisma.documentSecurityScan.deleteMany({ where: { document: { originalFileName: { startsWith: "tva-functional-smoke-" } } } });
  await prisma.uploadedDocument.deleteMany({ where: { originalFileName: { startsWith: "tva-functional-smoke-" } } });
  await prisma.client.deleteMany({ where: { OR: [{ companyName: { startsWith: "ZZ Smoke Client" } }, { companyName: { startsWith: "ZZ Import Smoke" } }] } });
  await prisma.lead.deleteMany({ where: { OR: [{ leadSource: "SMOKE" }, { firmName: "Smoke Cabinet" }] } });
  await prisma.reminderLog.deleteMany({ where: { clientCollectionId: ids.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } } });
  await prisma.operationalEvent.deleteMany({
    where: {
      clientCollectionId: ids.id,
      occurredAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      eventType: { in: ["CLIENT_ACCEPTED_RULES", "DOCUMENT_UPLOADED", "REMINDER_GENERATED"] }
    }
  });
  await prisma.clientCollection.update({ where: { id: ids.id }, data: { status: ids.status } });

  for (const item of checks) {
    console.log(`${item.ok ? "OK" : "FAIL"} ${item.name} ${item.detail}`);
  }
  const failed = checks.filter((item) => !item.ok);
  if (failed.length) {
    console.error(`Functional smoke failed: ${failed.map((item) => item.name).join(", ")}`);
    process.exitCode = 1;
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
