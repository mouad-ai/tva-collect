"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({
  children,
  message,
  className = "btn btn-danger"
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={(event) => {
        // UX-FIX: destructive actions require explicit confirmation before submit.
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {pending ? "Traitement..." : children}
    </button>
  );
}
