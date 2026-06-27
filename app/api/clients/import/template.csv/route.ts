import { NextResponse } from "next/server";

export async function GET() {
  const csv = [
    "companyName,contactName,phone,email,ice,taxId,city",
    "SARL Exemple,Karim Bennani,+212 661 00 00 00,karim@example.ma,001122334455,IF-2026-001,Casablanca"
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modele_import_clients.csv"'
    }
  });
}
