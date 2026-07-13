"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { updateUploadedDocumentQualityAction } from "@/app/actions";
import { cn } from "@/lib/utils";

type QualityStatus = "UNREVIEWED" | "VALID" | "WRONG_DOCUMENT" | "UNREADABLE" | "DUPLICATE" | "MISSING_PAGE" | "NOT_TVA";

type SaveResult = Awaited<ReturnType<typeof updateUploadedDocumentQualityAction>>;

const qualityOptions: { value: QualityStatus; label: string }[] = [
  { value: "UNREVIEWED", label: "À vérifier" },
  { value: "VALID", label: "Valide" },
  { value: "WRONG_DOCUMENT", label: "Mauvais document" },
  { value: "UNREADABLE", label: "Illisible" },
  { value: "DUPLICATE", label: "Doublon" },
  { value: "MISSING_PAGE", label: "Page manquante" },
  { value: "NOT_TVA", label: "Hors TVA" }
];

const qualityLabels = Object.fromEntries(qualityOptions.map((item) => [item.value, item.label])) as Record<QualityStatus, string>;

const toneByStatus: Record<QualityStatus, string> = {
  UNREVIEWED: "border-amber-200 bg-amber-50 text-amber-800",
  VALID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WRONG_DOCUMENT: "border-red-200 bg-red-50 text-red-700",
  UNREADABLE: "border-red-200 bg-red-50 text-red-700",
  DUPLICATE: "border-orange-200 bg-orange-50 text-orange-800",
  MISSING_PAGE: "border-orange-200 bg-orange-50 text-orange-800",
  NOT_TVA: "border-slate-200 bg-slate-50 text-slate-700"
};

function isQualityStatus(value: unknown): value is QualityStatus {
  return typeof value === "string" && qualityOptions.some((item) => item.value === value);
}

function normalizeQualityStatus(value: string): QualityStatus {
  return isQualityStatus(value) ? value : "UNREVIEWED";
}

function QualityBadge({ status, pending }: { status: QualityStatus; pending: boolean }) {
  return (
    <span className={cn("badge", toneByStatus[status], pending ? "opacity-75" : "")}>
      <span className="badge-dot" aria-hidden="true" />
      {qualityLabels[status]}
    </span>
  );
}

export function DocumentQualityForm({
  documentId,
  initialStatus,
  initialComment
}: {
  documentId: string;
  initialStatus: string;
  initialComment: string;
}) {
  const [status, setStatus] = useState<QualityStatus>(() => normalizeQualityStatus(initialStatus));
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();

  function submitQuality(formData: FormData) {
    const nextStatus = formData.get("qualityStatus");
    if (!isQualityStatus(nextStatus)) return;

    const previousStatus = status;
    const previousComment = comment;
    const nextComment = String(formData.get("accountantComment") || "");

    setError(null);
    setStatus(nextStatus);
    setComment(nextComment);
    setIsSaving(true);

    // isSaving (not useTransition's own isPending) drives the UI: this action
    // calls revalidatePath, and Next folds the resulting router refresh into
    // the same transition, so isPending can stay true well after our own
    // result already came back — that's what left the badge looking stuck on
    // "pending" until the page was manually refreshed. isSaving is set and
    // cleared by us alone, right around the result handling, so it always
    // reflects our own request/response cycle.
    startTransition(async () => {
      try {
        const result: SaveResult = await updateUploadedDocumentQualityAction(documentId, formData);
        if (result && "error" in result) {
          setStatus(previousStatus);
          setComment(previousComment);
          setError(result.error || "Impossible d enregistrer la modification.");
          return;
        }
        if (result && "ok" in result && result.ok) {
          setStatus(normalizeQualityStatus(result.qualityStatus));
          setComment(result.accountantComment || "");
        }
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
        submitQuality(new FormData(event.currentTarget));
      }}
    >
      <QualityBadge status={status} pending={isSaving} />
      <div className="doc-inline-form-row">
        <select name="qualityStatus" value={status} onChange={(event) => setStatus(event.target.value as QualityStatus)} aria-label="Statut de contrôle">
          {qualityOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-compact btn-primary" disabled={isSaving}>
          {isSaving ? <span className="spinner" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
          <span className="sr-only">Enregistrer le contrôle</span>
        </button>
      </div>
      <input
        name="accountantComment"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Commentaire interne (optionnel)"
      />
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}