"use client";

import { useState } from "react";

export function CheckoutButton({
  planCode,
  interval,
  children,
  className = "btn btn-primary"
}: {
  planCode: string;
  interval: "monthly" | "yearly";
  children: React.ReactNode;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planCode, interval })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.checkoutUrl) {
      setBusy(false);
      setError(data.error || "Impossible de creer le checkout.");
      return;
    }
    window.location.href = data.checkoutUrl;
  }

  return (
    <div className="grid gap-2">
      <button type="button" className={className} onClick={startCheckout} disabled={busy}>
        {busy ? "Redirection..." : children}
      </button>
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
