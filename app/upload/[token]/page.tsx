import { CheckCircle2, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { UploadForm } from "@/components/UploadForm";
import { StatusBadge } from "@/components/StatusBadge";
import { monthNames } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function PublicUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await prisma.clientCollection.findUnique({
    where: { uploadToken: token },
    include: {
      firm: true,
      client: true,
      collectionPeriod: true,
      requiredDocuments: { orderBy: { createdAt: "asc" } },
      uploadedDocuments: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!item || item.collectionPeriod.status === "CLOSED") notFound();

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto grid max-w-2xl gap-6">
        <header className="border-b border-border pb-4">
          <div className="text-sm font-bold text-primary">{item.firm.name}</div>
          <h1 className="mt-2 text-2xl font-black">Deposez vos documents TVA ici</h1>
          <p className="mt-1 text-sm text-muted">
            {item.client.companyName} · {monthNames[item.collectionPeriod.month - 1]} {item.collectionPeriod.year}
          </p>
        </header>

        <section className="card p-4">
          <h2 className="mb-3 font-black">Checklist demandee</h2>
          <div className="grid gap-2">
            {item.requiredDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <span className="font-bold">{doc.name}</span>
                <StatusBadge status={doc.status === "MISSING" ? "MISSING_DOC" : doc.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-4 font-black">Ajouter des fichiers</h2>
          <UploadForm token={token} requiredDocuments={item.requiredDocuments} />
          <p className="mt-3 text-xs text-muted">Formats acceptes : PDF, JPG, PNG, XLS, XLSX, DOC, DOCX. Maximum 10 Mo par fichier.</p>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-black">Fichiers deja recus</h2>
          <div className="grid gap-2">
            {item.uploadedDocuments.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span className="font-bold">{document.originalFileName}</span>
                </div>
                <span className="text-xs text-muted">{formatDate(document.createdAt)}</span>
              </div>
            ))}
            {!item.uploadedDocuments.length ? (
              <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-muted">
                <CheckCircle2 size={16} />
                Aucun fichier depose pour le moment.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
