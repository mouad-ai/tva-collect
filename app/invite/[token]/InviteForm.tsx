"use client";

import { useState } from "react";
import { acceptInviteAction } from "@/app/invite/actions";

export function InviteForm({ token }: { token: string }) {
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setError("");
    const result = await acceptInviteAction(token, formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={submit} className="grid gap-4">
      <label>Mot de passe<input name="password" type="password" required minLength={12} /></label>
      <label>Confirmer le mot de passe<input name="confirmPassword" type="password" required minLength={12} /></label>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <button className="btn btn-primary">Activer mon compte</button>
    </form>
  );
}
