import { InvoiceStatus } from "@prisma/client";
import { invoiceStatusLabel, invoiceStatusTone } from "@/lib/billing";
import { cn } from "@/lib/utils";

export function BillingInvoiceStatusBadge({ status }: { status: InvoiceStatus | string }) {
  return (
    <span className={cn("badge", invoiceStatusTone(String(status)))}>
      <span className="badge-dot" aria-hidden="true" />
      {invoiceStatusLabel(String(status))}
    </span>
  );
}
