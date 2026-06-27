"use client";

import { ClipboardList } from "lucide-react";
import { useState } from "react";

export function BulkReminderButton({ collectionId }: { collectionId: string }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true);
    const response = await fetch(`/api/collections/${collectionId}/bulk-reminders`, { method: "POST" });
    const data = (await response.json()) as { text?: string };
    if (data.text) {
      await navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
    setBusy(false);
  }

  return (
    <button className="btn" type="button" onClick={run} disabled={busy} title="Copier toutes les relances WhatsApp">
      <ClipboardList size={16} />
      {copied ? "Relances copiees" : "Relances en masse"}
    </button>
  );
}
