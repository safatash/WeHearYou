import { Field } from "@/components/ui";
import { formatDateTime } from "@/lib/campaigns";

export function LocationDetailsCard({
  details,
}: {
  details: {
    address: string;
    phone: string | null;
    website: string | null;
    hours: string | null;
    timezone: string | null;
    locationId: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    lastSyncedAt: Date | null;
    team: string[];
  };
}) {
  return (
    <div className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <h3 className="text-lg font-semibold text-slate-950">Location Details</h3>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Address" value={details.address || "—"} />
        <Field label="Phone" value={details.phone ?? "—"} />
        <Field label="Website" value={details.website ?? "—"} />
        <Field label="Hours" value={details.hours ?? "—"} />
        <Field label="Timezone" value={details.timezone ?? "—"} />
        <Field label="Location ID" value={details.locationId} />
        <Field
          label="Created"
          value={details.createdAt ? formatDateTime(details.createdAt) : "—"}
        />
        <Field
          label="Updated"
          value={details.updatedAt ? formatDateTime(details.updatedAt) : "—"}
        />
        <Field
          label="Last synced"
          value={details.lastSyncedAt ? formatDateTime(details.lastSyncedAt) : "—"}
        />
        <Field
          label="Team"
          value={details.team.length > 0 ? details.team.join(", ") : "—"}
        />
      </div>
    </div>
  );
}
