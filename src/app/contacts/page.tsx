export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { EmptyState, SectionHeading } from "@/components/ui";
import { formatContactSource, formatContactStatus, formatLastInvite, getContacts } from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = (await searchParams) ?? {};
  const selectedLocationId = typeof query.location === "string" ? query.location : null;
  const locationIds = await getCurrentAccessibleLocationIds();
  const filteredIds = selectedLocationId && locationIds.includes(selectedLocationId) ? [selectedLocationId] : locationIds;
  const contacts = await getContacts(filteredIds);

  return (
    <AppShell activeScreen="contacts" selectedLocationId={selectedLocationId ?? undefined}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        <SectionHeading
          eyebrow="Requests & Feedback"
          title="Contacts"
          description="People you can reach with review request campaigns."
          actions={
            <>
              <Link href="/contacts/import" className="btn btn-secondary">
                <Icon name="upload" size={16} aria-hidden="true" />
                Import CSV
              </Link>
              <Link href="/contacts/new" className="btn btn-primary">
                <Icon name="plus" size={16} aria-hidden="true" />
                Add contact
              </Link>
            </>
          }
        />

        {/* Table card */}
        {contacts.length === 0 ? (
            <EmptyState
              title="No contacts yet"
              body="Add a contact or import from CSV to start sending review requests."
              action={
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/contacts/new" className="btn btn-primary">
                    <Icon name="plus" size={16} aria-hidden="true" />
                    Add contact
                  </Link>
                  <Link href="/contacts/import" className="btn btn-secondary">
                    Import CSV
                  </Link>
                </div>
              }
            />
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden", overflowX: "auto" }}>
              <table style={{ minWidth: "100%", textAlign: "left", fontSize: 13.5 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ink-200)", color: "var(--ink-500)" }}>
                    <th scope="col" style={{ padding: "11px 16px", fontWeight: 540, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".05em" }}>Name</th>
                    <th scope="col" style={{ padding: "11px 16px", fontWeight: 540, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".05em" }}>Email</th>
                    <th scope="col" style={{ padding: "11px 16px", fontWeight: 540, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".05em" }}>Phone</th>
                    <th scope="col" style={{ padding: "11px 16px", fontWeight: 540, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".05em" }}>Source</th>
                    <th scope="col" style={{ padding: "11px 16px", fontWeight: 540, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".05em" }}>Status</th>
                    <th scope="col" style={{ padding: "11px 16px", fontWeight: 540, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".05em" }}>Last Invite</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} style={{ borderBottom: "1px solid var(--ink-150)", color: "var(--ink-700)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="focus-ring"
                          style={{ color: "var(--accent-ink)", fontWeight: 600, textDecoration: "none" }}
                        >
                          {contact.name}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px" }}>{contact.email}</td>
                      <td style={{ padding: "12px 16px" }}>{contact.phone}</td>
                      <td style={{ padding: "12px 16px" }}>{formatContactSource(contact.source)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="badge badge-accent">
                          {formatContactStatus(contact.status)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>{formatLastInvite(contact.lastInvitedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
