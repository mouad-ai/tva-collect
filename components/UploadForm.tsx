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

  // Per-file limit mirrors the server's validateUpload (10 Mo). The total
  // limit protects the Server Action's request-body cap (25mb in
  // next.config.ts): without this pre-check, a couple of large phone photos
  // sent together blow past the body limit and Next aborts the request with
  // the generic error page instead of a readable message.
  const maxFileBytes = 10 * 1024 * 1024;
  const maxTotalBytes = 20 * 1024 * 1024;

  function oversizeError(files: File[]) {
    const tooBig = files.find((file) => file.size > maxFileBytes);
    if (tooBig) return `"${tooBig.name}" dépasse 10 Mo. Réduisez la taille de la photo ou envoyez un PDF plus léger.`;
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > maxTotalBytes) return "Vos fichiers dépassent 20 Mo au total. Envoyez-les en plusieurs fois (2-3 fichiers à la fois).";
    return null;
  }

  async function action(formData: FormData) {
    const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    const sizeError = oversizeError(files);
    if (sizeError) {
      setIsError(true);
      setMessage(sizeError);
      return;
    }
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
      } catch {
        // Typical cause: the page was loaded before a redeploy, so its Server
        // Action ID no longer exists ("Failed to find Server Action"). Without
        // this catch the whole page crashes to the generic error screen —
        // clients keep upload links open for days, so tell them to reload.
        setIsError(true);
        setMessage("L'application a été mise à jour. Rechargez la page puis réessayez l'envoi.");
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
          {/* No `capture` attribute: on Android it would force the camera to
              open directly, hiding the native chooser (camera / galerie /
              fichiers). Without it the phone shows all three options, and the
              camera is still one of them thanks to accept="image/*". */}
          <input
            name="files"
            type="file"
            multiple
            required
            accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx,image/*"
            disabled={isSubmitting}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              setFileSummary(files.length ? `${files.length} fichier(s) sélectionné(s) · ${files.map((file) => file.name).slice(0, 3).join(", ")}` : "");
              const sizeError = oversizeError(files);
              setIsError(Boolean(sizeError));
              setMessage(sizeError || "");
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
