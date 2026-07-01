import { InvoiceStatus } from "@prisma/client";
import { invoiceStatusLabel, invoiceStatusTone } from "@/lib/billing";
import { cn } from "@/lib/utils";

export function BillingInvoiceStatusBadge({ status }: { status: InvoiceStatus | string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", invoiceStatusTone(String(status)))}>
      {invoiceStatusLabel(String(status))}
    </span>
  );
}
