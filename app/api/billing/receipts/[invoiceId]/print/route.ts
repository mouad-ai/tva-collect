import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { billingPaymentMethodLabel, formatMad } from "@/lib/billing";
import { escapeHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";
import { canAccessBilling } from "@/lib/security-policy";
import { formatDate } from "@/lib/utils";

function printShell(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #172033; margin: 32px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .muted { color: #667085; }
    .box { border: 1px solid #d9dee7; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .total { font-size: 22px; font-weight: 800; }
    @media print { body { margin: 0; } button { display: none; } }
  </style>
</head>
<body>
  ${body}
  <p style="margin-top:24px"><button onclick="window.print()">Imprimer</button></p>
</body>
</html>`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const receipt = await prisma.billingReceipt.findUnique({
    where: { invoiceId },
    include: { invoice: { include: { firm: true } } }
  });
  if (!receipt) notFound();
  const allowed = user.role === UserRole.ADMIN || (user.firmId === receipt.firmId && canAccessBilling(user.role));
  if (!allowed) notFound();

  const body = `
    <h1>Reçu ${escapeHtml(receipt.receiptNumber)}</h1>
    <p class="muted">TVA Collect — confirmation de paiement</p>
    <div class="box">
      <strong>${escapeHtml(receipt.invoice.firm.name)}</strong><br />
      Facture liée: ${escapeHtml(receipt.invoice.invoiceNumber)}
    </div>
    <div class="box">
      <p><strong>Montant payé:</strong> <span class="total">${formatMad(receipt.amountMad)}</span></p>
      <p><strong>Date de paiement:</strong> ${formatDate(receipt.paidAt)}</p>
      <p><strong>Mode:</strong> ${billingPaymentMethodLabel(receipt.paymentMethod)}</p>
      ${receipt.reference ? `<p><strong>Référence:</strong> ${escapeHtml(receipt.reference)}</p>` : ""}
    </div>
  `;
  return new Response(printShell(`Reçu ${escapeHtml(receipt.receiptNumber)}`, body), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
