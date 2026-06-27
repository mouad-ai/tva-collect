"use client";

import { Download, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ImportRow = {
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  ice?: string;
  taxId?: string;
  city?: string;
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors?: string[];
};

const columns = ["companyName", "contactName", "phone", "email", "ice", "taxId", "city"];

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] || "";
      return row;
    }, {});
  });
}

export function ClientImportForm() {
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const validRows = useMemo(() => rows.filter((row) => row.companyName.trim()), [rows]);

  async function onFileChange(file?: File) {
    setResult(null);
    if (!file) return;
    const text = await file.text();
    const parsedRows = parseCsv(text).map((row) => ({
      companyName: row.companyName || row["Company name"] || "",
      contactName: row.contactName || row["Contact name"] || "",
      phone: row.phone || "",
      email: row.email || "",
      ice: row.ice || row.ICE || "",
      taxId: row.taxId || row.IF || "",
      city: row.city || ""
    }));
    setRows(parsedRows);
    setErrors(parsedRows.map((row, index) => (!row.companyName.trim() ? `Ligne ${index + 2}: societe obligatoire.` : "")).filter(Boolean));
  }

  async function importRows() {
    setBusy(true);
    const response = await fetch("/api/clients/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: validRows })
    });
    const data = (await response.json()) as ImportResult;
    setResult(data);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <a className="btn" href="/api/clients/import/template.csv">
          <Download size={16} /> Modele CSV
        </a>
        <label className="btn w-fit cursor-pointer">
          <Upload size={16} /> Choisir fichier CSV
          <input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => onFileChange(event.target.files?.[0])} />
        </label>
      </div>

      {rows.length ? (
        <div className="rounded-md border border-border">
          <div className="border-b border-border p-3 text-sm font-bold">
            Apercu: {validRows.length} client(s) valide(s), {errors.length} erreur(s)
          </div>
          {errors.length ? (
            <div className="grid gap-1 border-b border-border bg-red-50 p-3 text-sm text-red-800">
              {errors.slice(0, 5).map((error) => <div key={error}>{error}</div>)}
            </div>
          ) : null}
          <div className="max-h-72 overflow-auto">
            <table>
              <thead>
                <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, index) => (
                  <tr key={`${row.companyName}-${index}`}>
                    {columns.map((column) => <td key={column}>{row[column as keyof ImportRow] || "-"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {rows.length ? (
        <button className="btn btn-primary w-fit" type="button" disabled={busy || !!errors.length || !validRows.length} onClick={importRows}>
          Confirmer import
        </button>
      ) : null}

      {result ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          Import termine: {result.created} cree(s), {result.updated} mis a jour, {result.skipped} ignore(s).
        </p>
      ) : null}
    </div>
  );
}
