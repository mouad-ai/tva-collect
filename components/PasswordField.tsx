"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordField({
  name,
  label,
  required = true,
  minLength = 10,
  defaultValue
}: {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = `field-${name}`;
  return (
    <label htmlFor={id}>
      {label}{required ? <span className="required-mark"> *</span> : null}
      <div className="password-field">
        {/* UX-FIX: password inputs support show/hide without blocking paste. */}
        <input id={id} name={name} type={visible ? "text" : "password"} required={required} minLength={minLength} defaultValue={defaultValue} />
        <button type="button" className="btn password-toggle" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
