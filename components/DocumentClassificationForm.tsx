"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { classifyUploadedDocumentAction } from "@/app/actions";

type RequiredDocumentOption = {
  id: string;
  name: string;
};

type SaveResult = Awaited<ReturnType<typeof classifyUploadedDocumentAction>>;

export function DocumentClassificationForm({
  documentId,
  requiredDocuments,
  initialRequiredDocumentId,
  initialRequiredDocumentName
}: {
  documentId: string;
  requiredDocuments: RequiredDocumentOption[];
  initialRequiredDocumentId: string;
  initialRequiredDocumentName: string | null;
}) {
  const [requiredDocumentId, setRequiredDocumentId] = useState(initialRequiredDocumentId);
  const [requiredDocumentName, setRequiredDocumentName] = useState(initialRequiredDocumentName);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();

  function submitClassification(formData: FormData) {
    const nextId = String(formData.get("requiredDocumentId") || "");
    const nextName = requiredDocuments.find((doc) => doc.id === nextId)?.name || null;
    const previousId = requiredDocumentId;
    const previousName = requiredDocumentName;

    setError(null);
    setRequiredDocumentId(nextId);
    setRequiredDocumentName(nextName);
    setIsSaving(true);

    // isSaving (not useTransition's own isPending) drives the UI — see
    // DocumentQualityForm for why: this action calls revalidatePath, and
    // Next folds the resulting router refresh into the same transition, so
    // isPending can stay true well after our own result already came back.
    startTransition(async () => {
      try {
        const result: SaveResult = await classifyUploadedDocumentAction(documentId, formData);
        if (result && "error" in result) {
          setRequiredDocumentId(previousId);
          setRequiredDocumentName(previousName);
          setError(result.error || "Impossible d enregistrer la modification.");
          return;
        }
        if (result && "ok" in result && result.ok) {
          setRequiredDocumentId(result.requiredDocumentId || "");
          setRequiredDocumentName(result.requiredDocumentName || null);
        }
      } catch {
        // Stale tab after a redeploy ("Failed to find Server Action") or a
        // network drop: revert the optimistic update and ask for a reload
        // instead of crashing the page to the generic error screen.
        setRequiredDocumentId(previousId);
        setRequiredDocumentName(previousName);
        setError("L'application a été mise à jour. Rechargez la page puis réessayez.");
      } finally {
        setIsSaving(false);
      }
    });
  }

  return (
    <form
      className="doc-inline-form"
      onChange={() => setError(null)}
      onSubmit={(event) => {
        event.preventDefault();
        submitClassification(new FormData(event.currentTarget));
      }}
    >
      <div className="doc-inline-form-row">
        <select name="requiredDocumentId" value={requiredDocumentId} onChange={(event) => setRequiredDocumentId(event.target.value)} aria-label="Type de document">
          <option value="">Autre / non classé</option>
          {requiredDocuments.map((doc) => (
            <option key={doc.id} value={doc.id}>{doc.name}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-compact btn-primary" disabled={isSaving}>
          {isSaving ? <span className="spinner" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
          <span className="sr-only">Enregistrer la classification</span>
        </button>
      </div>
      {requiredDocumentName ? (
        <div className="text-xs font-semibold text-muted">Actuel : {requiredDocumentName}</div>
      ) : null}
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}