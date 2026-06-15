export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatContactSource, formatContactStatus, formatLastInvite, getContacts } from "@/lib/contacts";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

export default async function ContactsPage() {
  const locationIds = await getCurrentAccessibleLocationIds();
  const contacts = await getContacts(locationIds);

  return (
    <AppShell activeScreen="contacts">
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: "var(--gutter)",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Contacts
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em", marginBottom: 8 }}>
              Contact list
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--ink-500)", maxWidth: 600, margin: 0 }}>
              Manage contacts from manual, CSV, and webhook sources.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/contacts/import" className="btn btn-secondary">
              📤 Import CSV
            </Link>
            <Link href="/contacts/new" className="btn btn-primary">
              ➕ Add Contact
            </Link>
          </div>
        </div>

        {/* Table card */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {contacts.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 620, color: "var(--ink-900)", marginBottom: 8 }}>
                No contacts yet
              </p>
              <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginBottom: 16 }}>
                Add a contact or import from CSV to get started.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <Link href="/contacts/new" className="btn btn-secondary">
                  Add Contact
                </Link>
                <Link href="/contacts/import" className="btn btn-secondary">
                  Import CSV
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: "100%", textAlign: "left", fontSize: 13.5 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ink-200)", color: "var(--ink-500)" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 11 }}>Name</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 11 }}>Email</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 11 }}>Phone</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 11 }}>Source</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 11 }}>Status</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 11 }}>Last Invite</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} style={{ borderBottom: "1px solid var(--ink-150)", color: "var(--ink-700)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <Link
                          href={`/contacts/${contact.id}`}
                          style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                        >
                          {contact.name}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px" }}>{contact.email}</td>
                      <td style={{ padding: "12px 16px" }}>{contact.phone}</td>
                      <td style={{ padding: "12px 16px" }}>{formatContactSource(contact.source)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="badge" style={{ fontSize: 11, background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
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
      </div>
    </AppShell>
  );
}
