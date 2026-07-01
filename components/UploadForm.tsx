"use client";

import { Upload } from "lucide-react";
import { useState, useTransition } from "react";
import { uploadDocumentsAction } from "@/app/actions";
import { clientAcknowledgementText, clientCompletionConfirmationText, clientPeriodConfirmationText } from "@/lib/constants";

export function UploadForm({
  token,
  requiredDocuments
}: {
  token: string;
  requiredDocuments: { name: string; status: string }[];
}) {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [fileSummary, setFileSummary] = useState("");
  const [isPending, startTransition] = useTransition();

  async function action(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = await uploadDocumentsAction(token, formData);
      setIsError(Boolean(result?.error));
      setMessage(result?.error ? result.error : "Documents reçus avec succes. Vous pouvez ajouter d'autres fichiers si besoin.");
    });
  }

  return (
    <form action={action} className="grid gap-4">
      <label>
        Type de document
        <select name="requiredDocumentName" defaultValue="">
          <option value="">Document non classe / autre</option>
          {requiredDocuments.map((doc) => (
            <option key={doc.name} value={doc.name}>
              {doc.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Votre nom
        <input name="uploadedByName" placeholder="Nom de la personne qui dépose" />
      </label>
      <label>
        Fichiers
        {/* UX-FIX: upload input declares accepted formats, supports camera capture and shows selected file count. */}
        <input
          name="files"
          type="file"
          multiple
          required
          accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx,image/*"
          capture="environment"
          disabled={isPending}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            setFileSummary(files.length ? `${files.length} fichier(s) selectionne(s) · ${files.map((file) => file.name).slice(0, 3).join(", ")}` : "");
          }}
        />
        <span className="text-xs text-muted">PDF, JPG, PNG, Excel ou Word. Taille maximum: 10 Mo par fichier.</span>
        {fileSummary ? <span className="text-xs font-bold text-primary">{fileSummary}</span> : null}
      </label>
      <label>
        Commentaire
        <textarea name="uploaderComment" rows={3} placeholder="Exemple : rélevé bancaire en attente de la banque" />
      </label>
      <label className="flex flex-row items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
        <input className="mt-1 w-4" type="checkbox" name="clientAcknowledgement" value="yes" required />
        <span>{clientAcknowledgementText}</span>
      </label>
      <label className="flex flex-row items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
        <input className="mt-1 w-4" type="checkbox" name="clientPeriodConfirmation" value="yes" required />
        <span>{clientPeriodConfirmationText}</span>
      </label>
      <label className="flex flex-row items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
        <input className="mt-1 w-4" type="checkbox" name="clientCompletionConfirmation" value="yes" required />
        <span>{clientCompletionConfirmationText}</span>
      </label>
      {message ? (
        <p className={isError ? "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" : "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"}>
          {message}
        </p>
      ) : null}
      {isPending ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-900">
          Envoi en cours. Gardez cette page ouverte jusqu&apos;a la confirmation.
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" />
          </div>
        </div>
      ) : null}
      <button className="btn btn-primary" disabled={isPending}>
        <Upload size={16} />
        {isPending ? "Envoi en cours..." : "Deposer les documents"}
      </button>
    </form>
  );
}
