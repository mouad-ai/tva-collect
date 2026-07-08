"use client";

import { Mail, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn, whatsAppLink } from "@/lib/utils";

type Channel = "WHATSAPP" | "EMAIL";

export function ReminderButton({
  clientCollectionId,
  channel,
  phone,
  email
}: {
  clientCollectionId: string;
  channel: Channel;
  phone?: string | null;
  email?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const canEmail = channel !== "EMAIL" || Boolean(email);
  const defaultLabel =
    channel === "WHATSAPP" ? (phone ? "Envoyer via WhatsApp" : "Copier WhatsApp") : email ? "Envoyer par email" : "Email indisponible";

  async function run() {
    if (!canEmail) {
      setFeedback({ ok: false, text: "Aucun email enregistré pour ce client." });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/client-collections/${clientCollectionId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel })
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok || !data.message) {
        setFeedback({ ok: false, text: data.error || "Erreur lors de l'envoi." });
        setTimeout(() => setFeedback(null), 4500);
        return;
      }
      await navigator.clipboard.writeText(data.message).catch(() => null);
      if (channel === "WHATSAPP") {
        const link = whatsAppLink(phone, data.message);
        if (link) {
          window.open(link, "_blank", "noopener,noreferrer");
          setFeedback({ ok: true, text: "WhatsApp ouvert" });
        } else {
          setFeedback({ ok: true, text: "Message copié" });
        }
      } else {
        setFeedback({ ok: true, text: "Email envoyé" });
      }
      setTimeout(() => setFeedback(null), 2200);
    } catch {
      setFeedback({ ok: false, text: "Erreur réseau. Réessayez." });
      setTimeout(() => setFeedback(null), 4500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={cn("btn", feedback && !feedback.ok && "border-red-200 text-red-700")}
      onClick={run}
      disabled={busy || (channel === "EMAIL" && !email)}
      title={feedback?.text || (channel === "EMAIL" && !email ? "Aucun email enregistré pour ce client." : defaultLabel)}
    >
      {channel === "WHATSAPP" ? <MessageSquare size={16} /> : <Mail size={16} />}
      {feedback ? feedback.text : defaultLabel}
    </button>
  );
}
