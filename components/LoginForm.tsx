"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label>
        Email
        <input name="email" type="email" defaultValue="demo@tvacollect.ma" required />
      </label>
      <label>
        Mot de passe
        <input name="password" type="password" defaultValue="password123" required />
      </label>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      <button className="btn btn-primary" disabled={busy}>
        <LogIn size={16} />
        Se connecter
      </button>
    </form>
  );
}
