"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createCampaign, quickCreateContact, saveDraftCampaign } from "@/app/campaigns/actions";
import { Icon } from "@/components/icon";
import { RCard } from "./components/rcard";
import { OptionCard } from "./components/option-card";
import { MessagePreview } from "./components/message-preview";
import { SendSummary } from "./components/send-summary";

type ContactItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  locationId: string;
};

type LocationItem = { id: string; name: string };

interface CampaignFormClientProps {
  initialContacts: ContactItem[];
  locations: LocationItem[];
  defaultLocationId: string | null;
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--ink-200)",
  background: "var(--white)",
  color: "var(--ink-900)",
  fontSize: 13.5,
  width: "100%",
};

function RLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
      <label style={{ fontSize: 12.5, fontWeight: 580, color: "var(--ink-700)" }}>{children}</label>
      {hint ? <span className="tnum" style={{ fontSize: 11.5, color: "var(--ink-400)" }}>{hint}</span> : null}
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function AvatarChip({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
        background: "var(--accent-soft)", color: "var(--accent-strong)", fontWeight: 640, fontSize: size * 0.42,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function CampaignFormClient({ initialContacts, locations, defaultLocationId }: CampaignFormClientProps) {
  const [name, setName] = useState("Manual review request");
  const [destination, setDestination] = useState<"REVIEW" | "VIDEO_TESTIMONIAL">("REVIEW");
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [channels, setChannels] = useState({ sms: false, email: true });
  const [emailSubject, setEmailSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [recipients, setRecipients] = useState<ContactItem[]>([]);
  const [previewChannel, setPreviewChannel] = useState<"sms" | "email">("email");

  const [isPending, startTransition] = useTransition();
  const [isSavingDraft, startDraftTransition] = useTransition();

  const currentLocation = locations.find((l) => l.id === locationId);
  const sampleName = recipients[0]?.name.split(" ")[0] || "Alex";
  const anyChannel = channels.sms || channels.email;
  const canSend = anyChannel && recipients.length > 0;

  // Derive the effective preview channel so we never store a channel that's off.
  const effectivePreview: "sms" | "email" = channels[previewChannel] ? previewChannel : channels.sms ? "sms" : "email";

  function changeLocation(id: string) {
    setLocationId(id);
    // Drop recipients that don't belong to the newly selected location.
    setRecipients((prev) => prev.filter((r) => r.locationId === id));
  }

  function toggleChannel(channel: "sms" | "email") {
    setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
  }

  function insertToken(token: string) {
    setMessageBody((prev) => (prev.length ? `${prev} ${token}` : token));
  }

  function buildFormData() {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("destination", destination);
    fd.append("locationId", locationId);
    if (channels.sms) fd.append("channels", "SMS");
    if (channels.email) fd.append("channels", "EMAIL");
    if (emailSubject) fd.append("emailSubject", emailSubject);
    if (messageBody) fd.append("messageBody", messageBody);
    for (const r of recipients) fd.append("contactIds", r.id);
    return fd;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      await createCampaign(buildFormData());
    });
  }

  function handleSaveDraft() {
    startDraftTransition(async () => {
      await saveDraftCampaign(buildFormData());
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
      {/* Header */}
      <Link
        href="/campaigns"
        className="tap"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-500)", fontSize: 12.5, fontWeight: 560, marginBottom: 8 }}
      >
        <Icon name="chevDown" size={15} style={{ transform: "rotate(90deg)" }} />Back to campaigns
      </Link>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Campaigns</div>
      <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Send review requests</h1>
      <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
        Create a one-off campaign to request reviews or video testimonials from your customers.
      </p>

      {/* Two-pane */}
      <div className="rr-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 348px", gap: "var(--gutter)", marginTop: "var(--gutter)" }}>
        {/* LEFT — form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)", minWidth: 0 }}>
          {/* 1 campaign */}
          <RCard step={1} title="Campaign" sub="Name it and choose what you're asking for.">
            <div>
              <RLabel>Campaign name</RLabel>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Post-visit review request" />
            </div>
            <div>
              <RLabel>Request type</RLabel>
              <div className="rr-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <OptionCard on={destination === "REVIEW"} onClick={() => setDestination("REVIEW")} icon="star" title="Review request" desc="Ask for a star review on your sites" />
                <OptionCard on={destination === "VIDEO_TESTIMONIAL"} onClick={() => setDestination("VIDEO_TESTIMONIAL")} icon="film" title="Video testimonial" desc="Ask for a short recorded video" />
              </div>
            </div>
          </RCard>

          {/* 2 sending */}
          <RCard step={2} title="Sending" sub="Where it comes from and how it's delivered.">
            <div>
              <RLabel>Sending location</RLabel>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={locationId} onChange={(e) => changeLocation(e.target.value)}>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <RLabel hint={!anyChannel ? "Pick at least one" : undefined}>Delivery channels</RLabel>
              <div className="rr-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <OptionCard kind="check" on={channels.sms} onClick={() => toggleChannel("sms")} icon="chat" title="SMS" desc="Text message — highest open rate" />
                <OptionCard kind="check" on={channels.email} onClick={() => toggleChannel("email")} icon="send" title="Email" desc="Good for longer follow-ups" />
              </div>
            </div>
          </RCard>

          {/* 3 message */}
          <RCard step={3} title="Message" sub="Leave blank to use your location's default copy.">
            {channels.email ? (
              <div>
                <RLabel>Email subject</RLabel>
                <input style={inputStyle} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder={`How was your experience with ${currentLocation?.name ?? "[Location]"}?`} />
              </div>
            ) : null}
            {channels.sms ? (
              <div>
                <RLabel hint={`${messageBody.length}/160`}>SMS message</RLabel>
                <textarea
                  rows={3}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  maxLength={480}
                  placeholder="Hi {first}, thanks for visiting {location}! We'd love a quick review: {link}"
                  style={{ ...inputStyle, height: "auto", padding: "11px 12px", resize: "vertical", lineHeight: 1.55, fontFamily: "inherit" }}
                />
              </div>
            ) : null}
            {!anyChannel ? (
              <div style={{ fontSize: 12.5, color: "var(--ink-400)" }}>Select a delivery channel above to edit its message.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-400)" }}>Insert:</span>
                {["{first}", "{location}", "{link}"].map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => (channels.sms ? insertToken(tok) : setEmailSubject((v) => (v.length ? `${v} ${tok}` : tok)))}
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, padding: "4px 9px", borderRadius: 6, border: "1px solid var(--ink-200)", background: "var(--ink-50)", color: "var(--accent-strong)", cursor: "pointer" }}
                  >
                    {tok}
                  </button>
                ))}
              </div>
            )}
          </RCard>

          {/* 4 recipients */}
          <RCard step={4} title="Recipients" sub="Select the contacts to include in this send." right={<span className="badge badge-neutral tnum">{recipients.length} selected</span>}>
            <RecipientPicker
              initialContacts={initialContacts}
              locationId={locationId}
              selectedRecipients={recipients}
              onRecipientsChange={setRecipients}
            />
          </RCard>
        </div>

        {/* RIGHT — preview + summary */}
        <div className="rr-side" style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
          <div style={{ position: "sticky", top: "var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
            {/* preview */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span className="badge badge-success"><span className="dot" style={{ background: "var(--success)" }} />Live preview</span>
                {channels.sms && channels.email ? (
                  <div style={{ display: "flex", gap: 3, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" }}>
                    {([["sms", "SMS"], ["email", "Email"]] as const).map(([k, lbl]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setPreviewChannel(k)}
                        style={{
                          border: 0, cursor: "pointer", padding: "4px 11px", borderRadius: 5, fontSize: 12, fontWeight: 560,
                          background: effectivePreview === k ? "var(--white)" : "transparent",
                          color: effectivePreview === k ? "var(--ink-900)" : "var(--ink-500)",
                          boxShadow: effectivePreview === k ? "var(--shadow-xs)" : "none",
                        }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {anyChannel ? (
                <MessagePreview
                  type={destination === "REVIEW" ? "review" : "video"}
                  channel={effectivePreview}
                  subject={emailSubject}
                  sms={messageBody}
                  sample={sampleName}
                  location={currentLocation?.name ?? "Your Business"}
                />
              ) : (
                <div style={{ height: 200, display: "grid", placeItems: "center", color: "var(--ink-400)", fontSize: 13, textAlign: "center" }}>
                  Select a delivery channel<br />to preview the message.
                </div>
              )}
            </div>

            {/* summary */}
            <SendSummary
              type={destination === "REVIEW" ? "Review request" : "Video testimonial"}
              location={currentLocation?.name ?? "—"}
              channels={channels}
              recipients={recipients.length}
            />
          </div>
        </div>
      </div>

      {/* Sticky footer action bar — bleeds to the gutter and pins to the
          bottom of the content column (stays clear of the app sidebar). */}
      <div
        className="rr-footer"
        style={{
          position: "sticky", bottom: 0, left: 0, right: 0, zIndex: 20,
          marginTop: "var(--gutter)",
          marginLeft: "calc(var(--gutter) * -1)", marginRight: "calc(var(--gutter) * -1)",
          padding: "14px var(--gutter)",
          background: "color-mix(in srgb, var(--white) 86%, transparent)", backdropFilter: "blur(8px)",
          borderTop: "1px solid var(--ink-200)",
          display: "flex", alignItems: "center", gap: 12,
        }}
      >
        <div style={{ fontSize: 12.5, color: "var(--ink-500)" }}>
          {canSend ? (
            <>Ready to send to <b className="tnum" style={{ color: "var(--ink-900)" }}>{recipients.length}</b> recipient{recipients.length === 1 ? "" : "s"}</>
          ) : !anyChannel ? "Select a delivery channel to continue" : "Add at least one recipient to send"}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Link href="/campaigns" className="btn btn-ghost">Cancel</Link>
          <button type="button" className="btn btn-secondary" onClick={handleSaveDraft} disabled={isSavingDraft || isPending}>
            {isSavingDraft ? "Saving…" : "Save draft"}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSend || isPending || isSavingDraft} style={{ opacity: canSend && !isSavingDraft ? 1 : 0.5 }}>
            <Icon name={isPending ? "check" : "send"} size={16} />{isPending ? "Sending…" : "Send review request"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ---- Recipient picker (chips + search + suggested + inline manual add) ----

interface RecipientPickerProps {
  initialContacts: ContactItem[];
  locationId: string;
  selectedRecipients: ContactItem[];
  onRecipientsChange: (recipients: ContactItem[]) => void;
}

function contactLine(c: ContactItem) {
  return [c.email, c.phone].filter(Boolean).join(" · ") || "No contact info";
}

function RecipientPicker({ initialContacts, locationId, selectedRecipients, onRecipientsChange }: RecipientPickerProps) {
  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [query, setQuery] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [mName, setMName] = useState("");
  const [mContact, setMContact] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const selectedIds = new Set(selectedRecipients.map((r) => r.id));
  const pool = contacts.filter((c) => c.locationId === locationId);
  const matches = pool.filter(
    (c) => !selectedIds.has(c.id) && (query.trim() === "" || `${c.name} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())),
  );

  function add(c: ContactItem) {
    if (selectedIds.has(c.id)) return;
    onRecipientsChange([...selectedRecipients, c]);
    setQuery("");
  }
  function remove(id: string) {
    onRecipientsChange(selectedRecipients.filter((r) => r.id !== id));
  }

  async function addManual() {
    setAddError(null);
    if (!mName.trim()) { setAddError("Name is required."); return; }
    if (!mContact.trim()) { setAddError("Email or phone is required."); return; }
    const isEmail = mContact.includes("@");
    setIsAdding(true);
    try {
      const fd = new FormData();
      fd.append("name", mName.trim());
      fd.append("email", isEmail ? mContact.trim() : "");
      fd.append("phone", isEmail ? "" : mContact.trim());
      fd.append("locationId", locationId);
      const contact = await quickCreateContact(fd);
      const newContact: ContactItem = { ...contact, locationId };
      setContacts((prev) => [...prev, newContact]);
      onRecipientsChange([...selectedRecipients, newContact]);
      setMName(""); setMContact(""); setOpenAdd(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add contact.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* selected chips */}
      {selectedRecipients.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {selectedRecipients.map((c) => (
            <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 9px 5px 5px", borderRadius: 999, background: "var(--accent-softer)", border: "1px solid var(--accent-border)" }}>
              <AvatarChip name={c.name} size={22} />
              <span style={{ fontSize: 12.5, fontWeight: 560, color: "var(--ink-800)" }}>{c.name}</span>
              <button type="button" onClick={() => remove(c.id)} className="tap" title="Remove" style={{ border: 0, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-400)", padding: 0 }}>
                <Icon name="close" size={13} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* search + add */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)" }} />
            <input className="focus-ring" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts by name, email, or phone…" style={{ ...inputStyle, paddingLeft: 32 }} />
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => setOpenAdd((o) => !o)}><Icon name="plus" size={15} />Add manually</button>
        </div>

        {/* manual add */}
        {openAdd ? (
          <div className="anim-up card" style={{ padding: 12, marginTop: 8, boxShadow: "var(--shadow-md)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <RLabel>Name</RLabel>
                <input className="focus-ring" style={inputStyle} value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div style={{ flex: 1.4 }}>
                <RLabel>Email or phone</RLabel>
                <input className="focus-ring" style={inputStyle} value={mContact} onChange={(e) => setMContact(e.target.value)} placeholder="jane@example.com" />
              </div>
              <button className="btn btn-primary" type="button" onClick={addManual} disabled={isAdding} style={{ flex: "none" }}>
                {isAdding ? "Adding…" : "Add"}
              </button>
            </div>
            {addError ? <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8, marginBottom: 0 }}>{addError}</p> : null}
          </div>
        ) : null}

        {/* matches dropdown */}
        {query.trim() !== "" && matches.length > 0 ? (
          <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, padding: 6, maxHeight: 240, overflowY: "auto", zIndex: 30, boxShadow: "var(--shadow-pop)" }}>
            {matches.map((c) => (
              <button key={c.id} type="button" onClick={() => add(c)} className="tap" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", background: "transparent", textAlign: "left" }}>
                <AvatarChip name={c.name} size={28} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 560 }}>{c.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-400)" }}>{contactLine(c)}</span>
                </span>
                <Icon name="plus" size={15} style={{ color: "var(--accent)" }} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* suggestions when nothing selected */}
      {selectedRecipients.length === 0 && query.trim() === "" ? (
        <div style={{ border: "1px dashed var(--ink-300)", borderRadius: "var(--r-md)", padding: 14, background: "var(--ink-50)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="eyebrow">Suggested · this location</span>
            {pool.length > 0 ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => onRecipientsChange(pool)}>Select all {pool.length}</button>
            ) : null}
          </div>
          {pool.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-400)", textAlign: "center", padding: "8px 0" }}>No contacts for this location. Add one above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pool.slice(0, 4).map((c) => (
                <button key={c.id} type="button" onClick={() => add(c)} className="tap focus-ring" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: "var(--r-sm)", border: 0, cursor: "pointer", background: "var(--white)", textAlign: "left", boxShadow: "var(--shadow-xs)" }}>
                  <AvatarChip name={c.name} size={26} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 560 }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--ink-400)" }}>{contactLine(c)}</span>
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 540, color: "var(--accent-strong)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="plus" size={13} />Add</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
