"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({
  text,
  label = "Copier",
  className = "btn"
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button type="button" className={className} onClick={copy} title={label}>
      <Copy size={16} />
      {copied ? "Copie" : label}
    </button>
  );
}
