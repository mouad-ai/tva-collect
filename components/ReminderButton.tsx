"use client";

import { MessageSquare, Mail } from "lucide-react";
import { useState } from "react";

export function ReminderButton({
  clientCollectionId,
  channel
}: {
  clientCollectionId: string;
  channel: "WHATSAPP" | "EMAIL";
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true);
    const response = await fetch(`/api/client-collections/${clientCollectionId}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel })
    });
    const data = (await response.json()) as { message?: string };
    if (data.message) {
      await navigator.clipboard.writeText(data.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
    setBusy(false);
  }

  return (
    <button type="button" className="btn" onClick={run} disabled={busy} title={`Copier relance ${channel}`}>
      {channel === "WHATSAPP" ? <MessageSquare size={16} /> : <Mail size={16} />}
      {copied ? "Copie" : channel === "WHATSAPP" ? "WhatsApp" : "Email"}
    </button>
  );
}
