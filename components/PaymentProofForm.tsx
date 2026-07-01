"use client";

import { PendingSubmitButton } from "@/components/PendingSubmitButton";

export function PaymentProofForm({
  invoiceId,
  defaultAmount,
  action
}: {
  invoiceId: string;
  defaultAmount: number;
  action: (invoiceId: string, formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action.bind(null, invoiceId)} className="grid gap-3 rounded-md border border-border p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          Mode de paiement
          <select name="method" defaultValue="BANK_TRANSFER">
            <option value="BANK_TRANSFER">Virement bancaire</option>
            <option value="CASH">Espèces</option>
            <option value="CHEQUE">Chèque</option>
            <option value="OTHER">Autre</option>
          </select>
        </label>
        <label>
          Montant payé (MAD)
          <input name="amountMad" type="number" min="1" defaultValue={defaultAmount} required />
        </label>
      </div>
      <label>
        Référence / libellé virement
        <input name="reference" placeholder="Ex. TVA-2026-0001" />
      </label>
      <label>
        Justificatif (PDF, JPG, PNG)
        <input name="proofFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required />
      </label>
      <PendingSubmitButton className="btn btn-primary">Envoyer la preuve de paiement</PendingSubmitButton>
    </form>
  );
}
