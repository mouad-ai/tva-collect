"use client";

import { useSearchParams } from "next/navigation";

export function LoginStatusMessages() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const reset = searchParams.get("reset");

  return (
    <>
      {invite === "accepted" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Compte activé. Vous pouvez vous connecter.
        </p>
      ) : null}
      {reset === "done" || reset === "success" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Mot de passe réinitialisé. Vous pouvez vous connecter.
        </p>
      ) : null}
    </>
  );
}
