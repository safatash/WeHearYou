"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Icon, type IconName } from "@/components/icon";
import { createContact } from "@/app/contacts/actions";

type LocationOption = { id: string; name: string; city: string; state: string };

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--ink-200)",
  background: "var(--white)",
  color: "var(--ink-900)",
  fontSize: 13.5,
  width: "100%",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 62,
  lineHeight: 1.5,
  resize: "vertical",
};

function CField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>{label}</span>
      {children}
    </label>
  );
}

function SecHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 640, letterSpacing: "-.01em", color: "var(--ink-900)" }}>{title}</h3>
      {sub ? <p style={{ fontSize: 12.5, color: "var(--ink-400)", marginTop: 4, lineHeight: 1.5 }}>{sub}</p> : null}
    </div>
  );
}

function Section({ eyebrow, sub, children }: { eyebrow: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: 22, marginTop: 22, borderTop: "1px solid var(--ink-150)" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>
      {sub ? <div style={{ fontSize: 12.5, color: "var(--ink-400)", marginBottom: 14, lineHeight: 1.5 }}>{sub}</div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

function ChannelCard({
  icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap"
      aria-pressed={active}
      style={{
        flex: 1,
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: "var(--r-md)",
        cursor: "pointer",
        border: active ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)",
        background: active ? "var(--accent-soft)" : "var(--white)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Icon name={icon} size={15} style={{ color: active ? "var(--accent-strong)" : "var(--ink-500)" }} />
        <span style={{ fontSize: 13, fontWeight: 620 }}>{label}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.4 }}>{hint}</div>
    </button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {!pending && <Icon name="check" size={16} />}
      {pending ? "Saving…" : "Save contact"}
    </button>
  );
}

export function NewContactForm({ locations }: { locations: LocationOption[] }) {
  const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const selected = locations.find((l) => l.id === locationId) ?? locations[0];

  return (
    <form action={createContact} style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
      {/* preferredChannel is read via formData.getAll() server-side */}
      <input type="hidden" name="preferredChannel" value={channel} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Add contact</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Create a new contact</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
            Add a contact manually and prepare them for future review request campaigns.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/contacts" className="btn btn-secondary">Cancel</Link>
          <SaveButton />
        </div>
      </div>

      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: "var(--gutter)", alignItems: "start" }}>
        {/* Details */}
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="Details" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <CField label="First name">
              <input name="firstName" style={inputStyle} placeholder="Jane" autoComplete="given-name" />
            </CField>
            <CField label="Last name">
              <input name="lastName" style={inputStyle} placeholder="Doe" autoComplete="family-name" />
            </CField>
            <CField label="Email">
              <input name="email" type="email" style={inputStyle} placeholder="jane@example.com" autoComplete="email" />
            </CField>
            <CField label="Phone">
              <input name="phone" type="tel" style={inputStyle} placeholder="(555) 000-0000" autoComplete="tel" />
            </CField>
          </div>

          <Section eyebrow="Preferred channel" sub="Which channel to use for review requests.">
            <div style={{ display: "flex", gap: 10 }}>
              <ChannelCard
                icon="chat"
                label="SMS"
                hint="Use text messages for review requests."
                active={channel === "SMS"}
                onClick={() => setChannel("SMS")}
              />
              <ChannelCard
                icon="mail"
                label="Email"
                hint="Use email when that's the better follow-up path."
                active={channel === "EMAIL"}
                onClick={() => setChannel("EMAIL")}
              />
            </div>
          </Section>

          <Section eyebrow="Location & tags">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <CField label="Location">
                <select name="locationId" style={inputStyle} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.city}, {l.state}
                    </option>
                  ))}
                </select>
              </CField>
              <CField label="Tags">
                <input name="tags" style={inputStyle} placeholder="e.g. VIP, repeat customer" />
              </CField>
            </div>
            <CField label="Notes">
              <textarea name="notes" style={textareaStyle} placeholder="Optional internal notes" />
            </CField>
          </Section>
        </div>

        {/* Routing */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)", position: "sticky", top: "var(--gutter)" }}>
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Routing" />
            <p style={{ fontSize: 12.5, color: "var(--ink-500)", lineHeight: 1.5, marginTop: 8 }}>
              Available to review request campaigns immediately after save, checked against existing contacts by email and phone to avoid duplicates.
            </p>
            <div className="hr" style={{ margin: "14px 0" }} />
            <div style={{ fontSize: 11, color: "var(--ink-400)", marginBottom: 3 }}>Assigned location</div>
            {selected ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 620 }}>
                <Icon name="pin" size={14} style={{ color: "var(--accent-strong)" }} />
                {selected.name} — {selected.city}, {selected.state}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--ink-400)" }}>No locations found</div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
