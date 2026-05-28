"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { importContacts } from "../actions";

type Location = { id: string; name: string };
type ParsedRow = { name: string | null; email: string | null; phone: string | null };
type Mapping = { name: string; firstName: string; lastName: string; email: string; phone: string };
type ImportResult = { imported: number; duplicates: number; skipped: number };

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const n = text.length;

  for (let i = 0; i < n; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < n && text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim()); field = "";
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && i + 1 < n && text[i + 1] === '\n') i++;
      row.push(field.trim()); field = "";
      if (row.some((f) => f)) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field.trim());
  if (row.some((f) => f)) rows.push(row);
  return rows;
}

const NAME_PATTERNS = ["name", "full_name", "fullname", "contact_name", "patient_name", "customer_name", "client_name"];
const FIRST_PATTERNS = ["first_name", "firstname", "fname", "given_name", "first"];
const LAST_PATTERNS = ["last_name", "lastname", "lname", "surname", "family_name", "last"];
const EMAIL_PATTERNS = ["email", "email_address", "emailaddress", "e-mail", "email address"];
const PHONE_PATTERNS = ["phone", "phone_number", "phonenumber", "mobile", "mobile_number", "cell", "cell_phone", "telephone", "tel", "phone number"];

function detectColumn(headers: string[], patterns: string[]) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const p of patterns) {
    const i = lower.findIndex((h) => h === p || h.includes(p));
    if (i >= 0) return headers[i];
  }
  return "";
}

function resolveRows(dataRows: string[][], headers: string[], mapping: Mapping): ParsedRow[] {
  return dataRows.map((row) => {
    const get = (col: string) => {
      const i = headers.indexOf(col);
      return i >= 0 ? row[i]?.trim() || null : null;
    };
    const fullName = get(mapping.name);
    const first = get(mapping.firstName);
    const last = get(mapping.lastName);
    const name = fullName || [first, last].filter(Boolean).join(" ") || null;
    return { name, email: get(mapping.email), phone: get(mapping.phone) };
  });
}

const ColSelect = ({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    >
      <option value="">— not mapped —</option>
      {headers.map((h) => (
        <option key={h} value={h}>{h}</option>
      ))}
    </select>
  </div>
);

export function ImportClient({ locations }: { locations: Location[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Mapping>({ name: "", firstName: "", lastName: "", email: "", phone: "" });
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [stage, setStage] = useState<"upload" | "map" | "done">("upload");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const loadFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) { setError("CSV needs at least a header row and one data row."); return; }
      const [headerRow, ...data] = rows;
      setHeaders(headerRow);
      setDataRows(data);
      setFileName(file.name);
      setMapping({
        name: detectColumn(headerRow, NAME_PATTERNS),
        firstName: detectColumn(headerRow, FIRST_PATTERNS),
        lastName: detectColumn(headerRow, LAST_PATTERNS),
        email: detectColumn(headerRow, EMAIL_PATTERNS),
        phone: detectColumn(headerRow, PHONE_PATTERNS),
      });
      setError("");
      setStage("map");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  const handleImport = async () => {
    if (!locationId) { setError("Select a location first."); return; }
    setIsSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("locationId", locationId);
      fd.append("contacts", JSON.stringify(resolveRows(dataRows, headers, mapping)));
      const res = await importContacts(fd);
      setResult(res);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (stage === "done" && result) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-slate-950">Import complete</h3>
        <p className="mt-2 text-slate-500">Here&apos;s a summary of what was imported from <span className="font-medium text-slate-700">{fileName}</span>.</p>
        <div className="mt-8 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50">
          <div className="p-5">
            <p className="text-3xl font-bold text-emerald-600">{result.imported}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Imported</p>
          </div>
          <div className="p-5">
            <p className="text-3xl font-bold text-amber-500">{result.duplicates}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Skipped</p>
          </div>
          <div className="p-5">
            <p className="text-3xl font-bold text-slate-400">{result.skipped}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empty rows</p>
          </div>
        </div>
        {result.duplicates > 0 && (
          <p className="mt-4 text-sm text-slate-500">{result.duplicates} row{result.duplicates !== 1 ? "s were" : " was"} skipped because the email or phone already exists for this location.</p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => { setStage("upload"); setHeaders([]); setDataRows([]); setFileName(""); setResult(null); }}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm"
          >
            Import another file
          </button>
          <Link href="/contacts" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm">
            View contacts
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "map") {
    const preview = resolveRows(dataRows, headers, mapping).slice(0, 5);
    const validCount = resolveRows(dataRows, headers, mapping).filter((r) => r.name || r.email || r.phone).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{fileName}</span> — {dataRows.length} rows detected
            </p>
            <button onClick={() => setStage("upload")} className="mt-1 text-xs text-indigo-600 hover:underline">
              Change file
            </button>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/contacts" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Cancel
            </Link>
            <button
              onClick={handleImport}
              disabled={isSubmitting || validCount === 0}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Importing…" : `Import ${validCount} contact${validCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>

        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Map columns</h3>
            <p className="mt-1 text-sm text-slate-500">Tell us which CSV columns contain each field. We&apos;ve made our best guess — adjust if needed.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ColSelect label="Full name column" value={mapping.name} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, name: v }))} />
              <ColSelect label="First name column" value={mapping.firstName} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, firstName: v }))} />
              <ColSelect label="Last name column" value={mapping.lastName} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, lastName: v }))} />
              <ColSelect label="Email column" value={mapping.email} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, email: v }))} />
              <ColSelect label="Phone column" value={mapping.phone} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, phone: v }))} />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Location</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Preview</h3>
            <p className="mt-1 text-sm text-slate-500">First {Math.min(5, dataRows.length)} rows after mapping.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="pb-2 pr-3 text-left font-medium">Name</th>
                    <th className="pb-2 pr-3 text-left font-medium">Email</th>
                    <th className="pb-2 text-left font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 text-slate-700">{row.name ?? <span className="text-slate-400">—</span>}</td>
                      <td className="py-2 pr-3 text-slate-700">{row.email ?? <span className="text-slate-400">—</span>}</td>
                      <td className="py-2 text-slate-700">{row.phone ?? <span className="text-slate-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {validCount} of {dataRows.length} rows have usable data
            </p>
          </section>
        </div>
      </div>
    );
  }

  // Upload stage
  return (
    <div className="space-y-6">
      <div className="flex gap-3 justify-end">
        <Link href="/contacts" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          Cancel
        </Link>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div
        className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-white p-16 text-center transition-colors ${
          isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-300"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <svg className="h-7 w-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="mt-4 text-base font-semibold text-slate-900">Drop your CSV file here</p>
        <p className="mt-1 text-sm text-slate-500">or click to browse from your computer</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-6 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          Choose file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        />
        <p className="mt-4 text-xs text-slate-400">CSV format · name, email, and/or phone columns</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-950">Expected format</h3>
        <p className="mt-2 text-sm text-slate-500">Your CSV should have a header row. We auto-detect common column names. Minimum: a name, email, or phone.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">name</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">email</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">phone</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-2 text-slate-700">Jane Smith</td>
                <td className="px-4 py-2 text-slate-700">jane@example.com</td>
                <td className="px-4 py-2 text-slate-700">555-123-4567</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-slate-700">John Doe</td>
                <td className="px-4 py-2 text-slate-700">john@example.com</td>
                <td className="px-4 py-2 text-slate-700">555-987-6543</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
