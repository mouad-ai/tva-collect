"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.status === 403 ? "Compte actif mais incomplet. Contactez l'administrateur TVA Collect." : "Email ou mot de passe incorrect.");
      return;
    }
    const data = await response.json().catch(() => ({ redirectTo: "/app" }));
    router.push(typeof data.redirectTo === "string" ? data.redirectTo : "/app");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <PasswordField name="password" label="Mot de passe" minLength={1} />
      <Link href="/forgot-password" className="text-sm font-bold text-primary">
        Mot de passe oublie ?
      </Link>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      <button className="btn btn-primary" disabled={busy}>
        <LogIn size={16} />
        Se connecter
      </button>
    </form>
  );
}
