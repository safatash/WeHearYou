"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { sendVideoTestimonialRequest } from "@/app/video-testimonials/actions";
import { Icon } from "@/components/icon";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locationId: string;
};

type Location = {
  id: string;
  name: string;
  city: string;
  state: string;
};

interface SendVideoRequestFormProps {
  locations: Location[];
  contacts: Contact[];
}

function VField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 560, color: "var(--ink-700)", marginBottom: 7 }}>{label}</label>
      {children}
      {hint ? <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

export function SendVideoRequestForm({ locations, contacts }: SendVideoRequestFormProps) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [contactQuery, setContactQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedLocation = locations.find((l) => l.id === locationId);
  const brand = selectedLocation?.name ?? "your location";
  const defaultPrompt = selectedLocation ? `How has ${selectedLocation.name} helped you?` : "";
  const displayPrompt = prompt || defaultPrompt;

  const filteredContacts = contactQuery.length > 0
    ? contacts
        .filter((c) => c.locationId === locationId)
        .filter((c) =>
          c.name.toLowerCase().includes(contactQuery.toLowerCase()) ||
          (c.email ?? "").toLowerCase().includes(contactQuery.toLowerCase()) ||
          (c.phone ?? "").includes(contactQuery)
        )
        .slice(0, 6)
    : [];

  function selectContact(c: Contact) {
    setSelectedContact(c);
    setContactQuery(c.name);
    setRecipientName(c.name);
    setRecipientEmail(c.email ?? "");
    setRecipientPhone(c.phone ?? "");
    setShowDropdown(false);
  }

  function clearContact() {
    setSelectedContact(null);
    setContactQuery("");
    setRecipientName("");
    setRecipientEmail("");
    setRecipientPhone("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const effName = selectedContact ? selectedContact.name : recipientName;
    if (!effName.trim()) {
      setErrorMessage("Recipient name is required.");
      return;
    }
    setErrorMessage(null);
    const fd = new FormData();
    fd.append("locationId", locationId);
    fd.append("recipientName", selectedContact ? selectedContact.name : recipientName);
    fd.append("recipientEmail", selectedContact ? (selectedContact.email ?? "") : recipientEmail);
    fd.append("recipientPhone", selectedContact ? (selectedContact.phone ?? "") : recipientPhone);
    fd.append("channel", channel);
    fd.append("prompt", displayPrompt);
    startTransition(async () => {
      try {
        await sendVideoTestimonialRequest(fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const effectiveName = selectedContact ? selectedContact.name : recipientName;
  const effectiveEmail = selectedContact ? (selectedContact.email ?? "") : recipientEmail;

  return (
    <div className="vt-request-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, .92fr)", gap: 26 }}>
      {/* Left — compose form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <VField label="Location">
          <select
            className="input"
            value={locationId}
            onChange={(e) => { setLocationId(e.target.value); clearContact(); }}
            required
            style={{ cursor: "pointer" }}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name} — {loc.city}, {loc.state}</option>
            ))}
          </select>
        </VField>

        <VField label="Contact" hint={selectedContact ? "Using a saved contact — edit the location to change." : "Or enter manually below if not in contacts."}>
          <div style={{ position: "relative" }}>
            <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)", pointerEvents: "none" }} />
            <input
              className="input"
              value={contactQuery}
              onChange={(e) => {
                setContactQuery(e.target.value);
                if (selectedContact) clearContact();
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search by name, email, or phone…"
              style={{ paddingLeft: 32, paddingRight: selectedContact ? 108 : 12 }}
            />
            {selectedContact ? (
              <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 560, color: "var(--accent-strong)" }}>
                <Icon name="check" size={12} />From contacts
              </span>
            ) : null}
            {showDropdown && filteredContacts.length > 0 ? (
              <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, padding: 6, zIndex: 30, boxShadow: "var(--shadow-pop)", maxHeight: 240, overflowY: "auto" }}>
                {filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => selectContact(c)}
                    className="tap"
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 9px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", background: "transparent", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 560, color: "var(--ink-900)" }}>{c.name}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{c.email ?? c.phone}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </VField>

        {/* Manual entry (shown when no contact selected) */}
        {!selectedContact ? (
          <div className="vt-manual-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: 12, background: "var(--ink-50)", border: "1px solid var(--ink-150)", borderRadius: "var(--r-md)" }}>
            <VField label="Name">
              <input className="input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required placeholder="Jane Smith" />
            </VField>
            <VField label="Email">
              <input className="input" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="jane@example.com" />
            </VField>
            <VField label="Phone">
              <input className="input" type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="+1 703 123 4567" />
            </VField>
          </div>
        ) : null}

        <VField label="Channel">
          <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" }}>
            {([["EMAIL", "Email", "send"], ["SMS", "SMS", "chat"]] as const).map(([k, lbl, ic]) => {
              const active = channel === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setChannel(k)}
                  style={{
                    flex: 1, border: 0, cursor: "pointer", padding: "8px 12px", borderRadius: 5, fontSize: 13, fontWeight: 560,
                    background: active ? "var(--white)" : "transparent", color: active ? "var(--ink-900)" : "var(--ink-500)",
                    boxShadow: active ? "var(--shadow-xs)" : "none", transition: "all .14s",
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                  }}
                >
                  <Icon name={ic} size={15} />{lbl}
                </button>
              );
            })}
          </div>
        </VField>

        <VField label="Recording prompt" hint={`Shown to the customer while recording. Defaults to “${defaultPrompt}” if left blank.`}>
          <textarea
            className="input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={defaultPrompt}
            rows={3}
            style={{ height: "auto", padding: "10px 12px", resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
          />
        </VField>

        {errorMessage ? <p style={{ fontSize: 12.5, color: "var(--danger)", margin: 0 }}>{errorMessage}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={isPending} style={{ height: 42 }}>
          <Icon name={isPending ? "check" : "send"} size={16} />{isPending ? "Sending…" : "Send video request"}
        </button>
      </form>

      {/* Right — live preview */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          {channel === "EMAIL" ? "Email preview" : "SMS preview"} — what {effectiveName || "your customer"} receives
        </div>
        {channel === "EMAIL" ? (
          <div style={{ border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ink-150)", background: "var(--ink-50)" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-400)" }}>From: {brand} via WeHearYou</div>
              {effectiveEmail ? <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 1 }}>To: {effectiveEmail}</div> : null}
              <div style={{ fontSize: 13.5, fontWeight: 620, marginTop: 3, color: "var(--ink-900)" }}>
                {effectiveName ? `${effectiveName}, can you share a quick video?` : "Share a quick video about your experience"}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0, lineHeight: 1.6 }}>Hi {effectiveName || "there"},</p>
              <p style={{ fontSize: 13, color: "var(--ink-600)", margin: "10px 0 0", lineHeight: 1.6 }}>
                Thank you for being a customer of {brand}. We&apos;d love to hear your experience in your own words — would you be willing to record a short 90-second video?
              </p>
              {displayPrompt ? (
                <div style={{ borderLeft: "3px solid var(--accent)", background: "var(--accent-soft)", borderRadius: "0 var(--r-sm) var(--r-sm) 0", padding: "10px 13px", margin: "14px 0", fontSize: 13, fontStyle: "italic", color: "var(--ink-700)" }}>
                  &ldquo;{displayPrompt}&rdquo;
                </div>
              ) : null}
              <div className="btn btn-primary" style={{ width: "100%", justifyContent: "center", pointerEvents: "none" }}>
                <Icon name="film" size={15} />Record my video
              </div>
              <p style={{ fontSize: 11.5, color: "var(--ink-400)", margin: "12px 0 0", textAlign: "center" }}>Nothing to download or install. Takes about 90 seconds.</p>
            </div>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--ink-200)", borderRadius: "var(--r-md)", padding: 16, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: "var(--ink-700)", lineHeight: 1.55, maxWidth: "85%" }}>
              Hi {effectiveName || "there"}! {brand} would love a quick video of your experience. Record one in ~90s (no app needed){displayPrompt ? `: “${displayPrompt}”` : ""} <span style={{ color: "var(--accent-strong)", fontWeight: 560 }}>wehear.you/r/…</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 8 }}>Sent from {brand} via WeHearYou</div>
          </div>
        )}
      </div>
    </div>
  );
}
