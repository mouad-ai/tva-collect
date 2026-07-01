import { Prisma, ReminderChannel } from "@prisma/client";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PaginationControls } from "@/components/PaginationControls";
import { ReminderButton } from "@/components/ReminderButton";
import { SearchFilterForm } from "@/components/SearchFilterForm";
import { requireFirmUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function RemindersPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; channel?: string; page?: string; limit?: string }>;
}) {
  const user = await requireFirmUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const limit = [10, 25, 50].includes(Number(params.limit)) ? Number(params.limit) : 10;
  const search = params.search?.trim();
  const channel = Object.values(ReminderChannel).includes(params.channel as ReminderChannel) ? params.channel as ReminderChannel : undefined;
  const clientCollectionWhere: Prisma.ClientCollectionWhereInput = {
    firmId: user.firmId,
    collectionPeriod: { status: "ACTIVE" },
    status: { in: ["NOT_STARTED", "IN_PROGRESS", "MISSING"] },
    OR: search ? [
      { client: { companyName: { contains: search, mode: "insensitive" } } },
      { client: { phone: { contains: search, mode: "insensitive" } } },
      { client: { email: { contains: search, mode: "insensitive" } } },
      { collectionPeriod: { name: { contains: search, mode: "insensitive" } } }
    ] : undefined
  };
  const historyWhere: Prisma.ReminderLogWhereInput = {
    firmId: user.firmId,
    channel,
    OR: search ? [
      { message: { contains: search, mode: "insensitive" } },
      { clientCollection: { client: { companyName: { contains: search, mode: "insensitive" } } } },
      { clientCollection: { collectionPeriod: { name: { contains: search, mode: "insensitive" } } } }
    ] : undefined
  };
  const [toRemind, history, historyTotal] = await Promise.all([
    prisma.clientCollection.findMany({
      where: clientCollectionWhere,
      include: {
        client: true,
        collectionPeriod: true,
        requiredDocuments: true,
        reminderLogs: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "asc" },
      take: 25
    }),
    prisma.reminderLog.findMany({
      where: historyWhere,
      include: { clientCollection: { include: { client: true, collectionPeriod: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.reminderLog.count({ where: historyWhere })
  ]);

  return (
    <div className="content-stack">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Relances</h1>
        <p className="text-sm text-muted">Clients a relancer, messages générés et historique.</p>
      </div>

      <section className="card p-4">
        <SearchFilterForm
          searchPlaceholder="Rechercher client, collecte, message"
          filters={[{ name: "channel", label: "Canal", value: params.channel, options: [
            { value: "", label: "Tous les canaux" },
            { value: "WHATSAPP", label: "WhatsApp" },
            { value: "EMAIL", label: "Email" }
          ] }]}
        />
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Relances a envoyer</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Collecte</th>
                <th>Manquants</th>
                <th>Derniere relance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {toRemind.map((item) => {
                const missingDocs = item.requiredDocuments.filter((doc) => doc.isRequired && doc.status === "MISSING");
                return (
                  <tr key={item.id}>
                    <td>
                      <Link className="font-bold" href={`/app/clients/${item.clientId}`}>{item.client.companyName}</Link>
                      <div className="text-xs text-muted">{item.client.phone || item.client.email || "Contact manquant"}</div>
                    </td>
                    <td><Link href={`/app/collections/${item.collectionPeriodId}`}>{item.collectionPeriod.name}</Link></td>
                    <td>{missingDocs.length}</td>
                    <td>{formatDate(item.reminderLogs[0]?.createdAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <ReminderButton clientCollectionId={item.id} channel="WHATSAPP" />
                        <ReminderButton clientCollectionId={item.id} channel="EMAIL" />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!toRemind.length ? (
                <tr><td colSpan={5}><EmptyState title="Aucune relance urgente" description="Aucun client actif ne correspond aux filtres." /></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card min-w-0 overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-extrabold">Historique des relances</h2>
        </div>
        <PaginationControls total={historyTotal} page={page} limit={limit} searchParams={params} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Collecte</th>
                <th>Canal</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {history.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>{log.clientCollection.client.companyName}</td>
                  <td>{log.clientCollection.collectionPeriod.name}</td>
                  <td>{log.channel}</td>
                  <td className="max-w-xl whitespace-pre-wrap text-sm">{log.message.slice(0, 260)}{log.message.length > 260 ? "..." : ""}</td>
                </tr>
              ))}
              {!history.length ? (
                <tr><td colSpan={5}><EmptyState title="Aucune relance générée" description="L'historique apparaitra apres generation des premiers messages." /></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls total={historyTotal} page={page} limit={limit} searchParams={params} />
      </section>
    </div>
  );
}

