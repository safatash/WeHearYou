/* WeHearYou — Contacts: list + new contact record */
const { useState: useStateC } = React;

const CONTACTS_MOCK = [
  { id: "c1", name: "Marcus Webb", email: "marcus.webb@gmail.com", phone: "(415) 555-0110", loc: "dt", channel: "sms", tag: "Repeat" },
  { id: "c2", name: "Priya Anand", email: "priya.a@outlook.com", phone: "(408) 555-0148", loc: "wp", channel: "email", tag: "VIP" },
  { id: "c3", name: "Jordan Avery", email: "jordan.avery@icloud.com", phone: "(510) 555-0121", loc: "nb", channel: "sms", tag: "" },
  { id: "c4", name: "Lena Fischer", email: "lena.f@gmail.com", phone: "(415) 555-0199", loc: "dt", channel: "email", tag: "" },
];

const CField = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>{label}</span>
    {children}
  </label>
);

const ChannelCard = ({ icon, label, hint, active, onClick }) => (
  <button type="button" onClick={onClick} className="tap"
    style={{ flex: 1, textAlign: "left", padding: "12px 14px", borderRadius: "var(--r-md)", cursor: "pointer",
      border: active ? "1.5px solid var(--accent)" : "1px solid var(--ink-200)", background: active ? "var(--accent-soft)" : "var(--white)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <Icon name={icon} size={15} style={{ color: active ? "var(--accent-strong)" : "var(--ink-500)" }} />
      <span style={{ fontSize: 13, fontWeight: 620 }}>{label}</span>
    </div>
    <div style={{ fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.4 }}>{hint}</div>
  </button>
);

const ContactNew = ({ onDone }) => {
  const locs = LOCATIONS.filter(l => l.id !== "all");
  const [form, setForm] = useStateC({ first: "", last: "", email: "", phone: "", channel: "sms", locId: locs[0].id, tags: "", notes: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const loc = locs.find(l => l.id === form.locId);
  const fire = useToast();

  const save = () => { fire("Contact saved"); onDone(); };

  return (
    <Page>
      <PageHeader eyebrow="Add contact" title="Create a new contact"
        sub="Add a contact manually and prepare them for future review request campaigns."
        actions={<div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onDone}>Cancel</button>
          <button className="btn btn-primary" onClick={save}><Icon name="check" size={16} />Save contact</button>
        </div>} />

      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: "var(--gutter)", alignItems: "start" }}>
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="Details" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
            <CField label="First name"><input className="input" value={form.first} onChange={e => set("first", e.target.value)} placeholder="Jane" /></CField>
            <CField label="Last name"><input className="input" value={form.last} onChange={e => set("last", e.target.value)} placeholder="Doe" /></CField>
            <CField label="Email"><input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@example.com" /></CField>
            <CField label="Phone"><input className="input" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 000-0000" /></CField>
          </div>

          <FBSection eyebrow="Preferred channel" sub="Which channel to use for review requests.">
            <div style={{ display: "flex", gap: 10 }}>
              <ChannelCard icon="messageSquare" label="SMS" hint="Use text messages for review requests." active={form.channel === "sms"} onClick={() => set("channel", "sms")} />
              <ChannelCard icon="mail" label="Email" hint="Use email when that's the better follow-up path." active={form.channel === "email"} onClick={() => set("channel", "email")} />
            </div>
          </FBSection>

          <FBSection eyebrow="Location & tags">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <CField label="Location">
                <select className="input" value={form.locId} onChange={e => set("locId", e.target.value)}>
                  {locs.map(l => <option key={l.id} value={l.id}>{l.name} — {l.area}</option>)}
                </select>
              </CField>
              <CField label="Tags"><input className="input" value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="e.g. VIP, repeat customer" /></CField>
            </div>
            <CField label="Notes">
              <textarea className="input" rows={2} style={{ height: "auto", padding: "11px 12px", lineHeight: 1.5, resize: "vertical" }}
                value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional internal notes" />
            </CField>
          </FBSection>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)", position: "sticky", top: "var(--gutter)" }}>
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Routing" />
            <p style={{ fontSize: 12.5, color: "var(--ink-500)", lineHeight: 1.5, marginTop: 8 }}>
              Available to review request campaigns immediately after save, checked against existing contacts by email and phone to avoid duplicates.
            </p>
            <div className="hr" style={{ margin: "14px 0" }} />
            <div style={{ fontSize: 11, color: "var(--ink-400)", marginBottom: 3 }}>Assigned location</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 620 }}>
              <Icon name="pin" size={14} style={{ color: "var(--accent-strong)" }} />{loc.name} — {loc.area}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

const ContactsList = ({ onNew }) => {
  const [q, setQ] = useStateC("");
  const rows = CONTACTS_MOCK.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Page>
      <PageHeader eyebrow="Requests & Feedback" title="Contacts" sub="People you can reach with review request campaigns."
        actions={<button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={16} />Add contact</button>} />
      <div className="card" style={{ padding: "var(--card-pad)" }}>
        <div style={{ position: "relative", maxWidth: 320, marginBottom: 14 }}>
          <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)" }} />
          <input className="input focus-ring" value={q} onChange={e => setQ(e.target.value)} placeholder="Search contacts…" style={{ paddingLeft: 32 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map(c => {
            const loc = LOCATIONS.find(l => l.id === c.loc);
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderTop: "1px solid var(--ink-150)" }}>
                <Avatar name={c.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-400)" }}>{c.channel === "email" ? c.email : c.phone}</div>
                </div>
                <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{loc.name} — {loc.area}</span>
                <Icon name={c.channel === "email" ? "mail" : "messageSquare"} size={15} style={{ color: "var(--ink-400)" }} />
                {c.tag && <span className="badge badge-neutral">{c.tag}</span>}
              </div>
            );
          })}
          {rows.length === 0 && <div style={{ padding: "24px 4px", textAlign: "center", fontSize: 13, color: "var(--ink-400)" }}>No contacts match your search.</div>}
        </div>
      </div>
    </Page>
  );
};

const Contacts = () => {
  const [view, setView] = useStateC("list");
  return view === "new" ? <ContactNew onDone={() => setView("list")} /> : <ContactsList onNew={() => setView("new")} />;
};

Object.assign(window, { Contacts });
