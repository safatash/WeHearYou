export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations } from "@/lib/locations";
import { ImportClient } from "./import-client";

export default async function ImportContactsPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const locations = await getLocations(locationIds);

  return (
    <AppShell activeScreen="contacts">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Import CSV</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Upload contacts in bulk</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Upload a CSV file to add contacts in bulk. We&apos;ll auto-detect columns and skip duplicates based on email or phone.
          </p>
        </div>
        <ImportClient locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
      </div>
    </AppShell>
  );
}
