"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  pendingLabel = "Traitement...",
  className = "btn btn-primary"
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {/* UX-FIX: async submit buttons show busy state and prevent double submit. */}
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
