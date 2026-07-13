"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

export function CustomerPortalButton({ className = "btn btn-primary" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/billing/lemonsqueezy/customer-portal", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.portalUrl) {
      setBusy(false);
      setError(data.error || "Impossible d'ouvrir le portail.");
      return;
    }
    window.open(data.portalUrl, "_blank", "noopener,noreferrer");
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      <button type="button" className={className} onClick={openPortal} disabled={busy}>
        {busy ? "Ouverture..." : "Gerer l'abonnement"} <ExternalLink size={16} />
      </button>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
