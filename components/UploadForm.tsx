"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { uploadDocumentsAction } from "@/app/actions";
import { clientAcknowledgementText, clientCompletionConfirmationText, clientPeriodConfirmationText } from "@/lib/constants";

export function UploadForm({
  token,
  requiredDocuments
}: {
  token: string;
  requiredDocuments: { id: string; name: string; status: string }[];
}) {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function action(formData: FormData) {
    const result = await uploadDocumentsAction(token, formData);
    setIsError(Boolean(result?.error));
    setMessage(result?.error ? result.error : "Documents recus. Vous pouvez ajouter d'autres fichiers si besoin.");
  }

  return (
    <form action={action} className="grid gap-4">
      <label>
        Type de document
        <select name="requiredDocumentId" defaultValue="">
          <option value="">Document non classe / autre</option>
          {requiredDocuments.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Votre nom
        <input name="uploadedByName" placeholder="Nom de la personne qui depose" />
      </label>
      <label>
        Fichiers
        <input name="files" type="file" multiple required accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" />
      </label>
      <label>
        Commentaire
        <textarea name="uploaderComment" rows={3} placeholder="Exemple : releve bancaire en attente de la banque" />
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
      <button className="btn btn-primary">
        <Upload size={16} />
        Deposer les documents
      </button>
    </form>
  );
}
