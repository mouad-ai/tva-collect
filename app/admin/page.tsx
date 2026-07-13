import { Building2, FileStack, HardDrive, Target, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/utils";

export const metadata = { title: "Tableau de bord admin" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [firms, users, clients, documents, leads, recentEvents] = await Promise.all([
    prisma.firm.count(),
    prisma.user.count(),
    prisma.client.count(),
    prisma.uploadedDocument.findMany({ select: { size: true } }),
    prisma.lead.count(),
    prisma.operationalEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 8 })
  ]);
  const storage = documents.reduce((sum, document) => sum + document.size, 0);

  const kpis = [
    { label: "Cabinets", value: firms, icon: Building2 },
    { label: "Utilisateurs", value: users, icon: Users },
    { label: "Clients", value: clients, icon: Users },
    { label: "Documents", value: documents.length, icon: FileStack },
    { label: "Prospects", value: leads, icon: Target }
  ];

  return (
    <div className="content-stack">
      <PageHeader
        label="Administration"
        title="Tableau de bord admin"
        description="Vue interne SaaS : cabinets, usage, prospects et activité récente."
      />

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-label">
              <Icon size={15} className="text-admin" />
              {label}
            </div>
            <div className="stat-card-value">{value}</div>
          </div>
        ))}
      </section>

      <section className="stat-card sm:max-w-xs">
        <div className="stat-card-label">
          <HardDrive size={15} className="text-admin" />
          Stockage total
        </div>
        <div className="stat-card-value">{formatBytes(storage)}</div>
        <div className="stat-card-note">Tous cabinets confondus</div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-extrabold">Activité récente</h2>
            <p className="text-sm text-muted">Derniers événements enregistrés sur la plateforme.</p>
          </div>
          <Link href="/admin/events" className="btn">Voir événements</Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Titre</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDate(event.occurredAt)}</td>
                  <td>{event.eventType}</td>
                  <td>{event.eventTitle}</td>
                  <td>{event.source}</td>
                </tr>
              ))}
              {!recentEvents.length ? <tr><td colSpan={4} className="text-muted">Aucun evenement pour le moment.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
