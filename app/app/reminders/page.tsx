import Link from "next/link";
import { ReminderButton } from "@/components/ReminderButton";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function RemindersPage() {
  const user = await requireUser();
  const [toRemind, history] = await Promise.all([
    prisma.clientCollection.findMany({
      where: { firmId: user.firmId, collectionPeriod: { status: "ACTIVE" }, status: { in: ["NOT_STARTED", "IN_PROGRESS", "MISSING"] } },
      include: {
        client: true,
        collectionPeriod: true,
        requiredDocuments: true,
        reminderLogs: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "asc" },
      take: 20
    }),
    prisma.reminderLog.findMany({
      where: { firmId: user.firmId },
      include: { clientCollection: { include: { client: true, collectionPeriod: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black">Relances</h1>
        <p className="text-sm text-muted">Clients a relancer, messages generes et historique.</p>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Relances a envoyer</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
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
                <tr><td colSpan={5} className="text-muted">Aucune relance urgente pour le moment.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-black">Historique des relances</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
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
                <tr><td colSpan={5} className="text-muted">Aucune relance generee.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
