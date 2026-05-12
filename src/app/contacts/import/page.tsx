import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Field } from "@/components/ui";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { getLocations } from "@/lib/locations";

export default async function ImportContactsPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const locations = await getLocations(locationIds);
  const defaultLocation = locations[0];

  return (
    <AppShell activeScreen="contacts">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Import CSV</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Upload contacts in bulk</h2>
            <p className="mt-3 max-w-3xl text-slate-600">
              Prototype the CSV import workflow with mapping, duplicate protection, and location assignment before contacts enter the review request pipeline.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/contacts" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">
              Back to Contacts
            </Link>
            <Link href="/contacts" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white shadow-sm visited:!text-white hover:!text-white">
              Import 128 Contacts
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">File mapping</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Uploaded file" value="brooklyn-patients-april.csv" />
              <Field label="Detected rows" value="128 contacts" />
              <Field label="Name column" value="full_name" />
              <Field label="Email column" value="email_address" />
              <Field label="Phone column" value="mobile_number" />
              <Field label="Location assignment" value={defaultLocation?.name ?? "No accessible location"} />
            </div>
            <div className="mt-5">
              <Field
                label="Import notes"
                value="12 duplicate rows detected by matching phone and email. 116 contacts ready to import, 8 flagged for review, 4 missing phone numbers and set to email-only."
                multiline
              />
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Import health</h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">116 ready to import</div>
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">8 need manual review</div>
                <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">4 email-only records detected</div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">After import</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Imported contacts become available in the contacts table immediately, can be assigned to automations, and can receive manual review requests without extra setup.
              </p>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
