import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { formatMad, getPlatformBillingSettings } from "@/lib/billing";
import { firmStatusLabel, planLabel } from "@/lib/labels";
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
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 0; text-align: left; }
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const invoice = await prisma.billingInvoice.findUnique({
    where: { id },
    include: { firm: true, subscription: { include: { plan: true } } }
  });
  if (!invoice) notFound();
  const allowed = user.role === UserRole.ADMIN || (user.firmId === invoice.firmId && canAccessBilling(user.role));
  if (!allowed) notFound();

  const settings = await getPlatformBillingSettings();
  const body = `
    <h1>Facture ${invoice.invoiceNumber}</h1>
    <p class="muted">TVA Collect — facturation manuelle B2B</p>
    <div class="box">
      <strong>${invoice.firm.name}</strong><br />
      ${invoice.firm.email || ""}<br />
      ${invoice.firm.city || ""}
    </div>
    <table>
      <tr><th>Plan</th><td>${planLabel(invoice.subscription?.plan.code || invoice.firm.plan)}</td></tr>
      <tr><th>Période</th><td>${formatDate(invoice.createdAt)} → ${formatDate(invoice.dueDate)}</td></tr>
      <tr><th>Échéance</th><td>${formatDate(invoice.dueDate)}</td></tr>
      <tr><th>Statut cabinet</th><td>${firmStatusLabel(invoice.firm.status)}</td></tr>
      <tr><th>Montant</th><td class="total">${formatMad(invoice.amountMad)}</td></tr>
    </table>
    <div class="box">
      <strong>Instructions de paiement</strong>
      <p>${settings.paymentInstructions || ""}</p>
      <p><strong>Banque:</strong> ${settings.bankName || "-"}</p>
      <p><strong>Titulaire:</strong> ${settings.accountHolder || "-"}</p>
      <p><strong>RIB:</strong> ${settings.rib || "-"}</p>
      ${settings.iban ? `<p><strong>IBAN:</strong> ${settings.iban}</p>` : ""}
      <p><strong>Référence à indiquer:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Support:</strong> ${settings.supportEmail || "-"} ${settings.supportWhatsapp ? `— ${settings.supportWhatsapp}` : ""}</p>
    </div>
  `;
  return new Response(printShell(`Facture ${invoice.invoiceNumber}`, body), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
