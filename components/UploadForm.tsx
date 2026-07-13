"use client";

import { Upload, UploadCloud } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  async function action(formData: FormData) {
    setMessage("");
    setIsSubmitting(true);
    startTransition(async () => {
      // Don't rely on useTransition's own isPending to drive the UI here: this
      // action calls revalidatePath, and Next folds the resulting router
      // refresh into the same transition, so isPending can stay true after
      // our own result already arrived (or briefly overlap with it) — that's
      // what caused the success message and the "uploading" banner to show
      // at the same time. isSubmitting is set/cleared by us alone, in the
      // same block as the message, so the two states can never overlap.
      try {
        const result = await uploadDocumentsAction(token, formData);
        setIsError(Boolean(result?.error));
        setMessage(result?.error ? result.error : "Documents reçus avec succès. Vous pouvez ajouter d'autres fichiers si besoin.");
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  return (
    <form action={action} className="grid gap-4">
      <label>
        Type de document
        <select name="requiredDocumentName" defaultValue="">
          <option value="">Document non classé / autre</option>
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
        Fichiers<span className="required-mark"> *</span>
        {/* UX-FIX: upload input declares accepted formats, supports camera capture and shows selected file count. */}
        <div className="relative order-2 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-teal-50/40 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-teal-50">
          <UploadCloud size={26} className="text-primary" aria-hidden="true" />
          <span className="text-sm font-bold text-ink">Touchez pour choisir vos fichiers</span>
          <span className="text-xs text-muted">ou prenez une photo directement</span>
          <input
            name="files"
            type="file"
            multiple
            required
            accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx,image/*"
            capture="environment"
            disabled={isSubmitting}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              setFileSummary(files.length ? `${files.length} fichier(s) sélectionné(s) · ${files.map((file) => file.name).slice(0, 3).join(", ")}` : "");
            }}
          />
        </div>
        <span className="field-hint">PDF, JPG, PNG, Excel ou Word. Taille maximum : 10 Mo par fichier.</span>
        {fileSummary ? <span className="field-hint order-3 font-bold text-primary">{fileSummary}</span> : null}
      </label>
      <label>
        Commentaire
        <textarea name="uploaderComment" rows={3} placeholder="Exemple : relevé bancaire en attente de la banque" />
      </label>
      <div className="grid gap-2">
        <label className="flex flex-row items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          <input className="mt-1 w-4" type="checkbox" name="clientAcknowledgement" value="yes" required />
          <span>{clientAcknowledgementText}</span>
        </label>
        <label className="flex flex-row items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          <input className="mt-1 w-4" type="checkbox" name="clientPeriodConfirmation" value="yes" required />
          <span>{clientPeriodConfirmationText}</span>
        </label>
        <label className="flex flex-row items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          <input className="mt-1 w-4" type="checkbox" name="clientCompletionConfirmation" value="yes" required />
          <span>{clientCompletionConfirmationText}</span>
        </label>
      </div>
      {isSubmitting ? (
        <div className="alert alert-info">
          <div className="flex-1">
            Envoi en cours. Gardez cette page ouverte jusqu&apos;à la confirmation.
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" />
            </div>
          </div>
        </div>
      ) : message ? (
        <p className={isError ? "alert alert-danger" : "alert alert-success"}>{message}</p>
      ) : null}
      <button className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? <span className="spinner" aria-hidden="true" /> : <Upload size={16} />}
        {isSubmitting ? "Envoi en cours..." : "Déposer les documents"}
      </button>
    </form>
  );
}
