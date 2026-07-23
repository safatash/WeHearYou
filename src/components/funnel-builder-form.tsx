"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Icon } from "@/components/icon";
import { saveFunnelBuilderSettings, type FunnelBuilderActionState } from "@/app/locations/actions";

const initialState: FunnelBuilderActionState = {
  success: false,
};

type FunnelDefaults = {
  funnelRatingStyle: string;
  funnelPromptTitle: string;
  funnelPromptBody: string;
  funnelPrivateTitle: string;
  funnelPrivateBody: string;
  funnelPrivateSubmitLabel: string;
  funnelThanksPublicTitle: string;
  funnelThanksPublicBody: string;
  funnelThanksPrivateTitle: string;
  funnelThanksPrivateBody: string;
  funnelReviewButtonLabel: string;
};

type LocationOption = {
  id: string;
  name: string;
  city: string;
  state: string;
  slug: string;
};

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

function FBField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>{label}</span>
      {children}
    </label>
  );
}

function FBSection({
  eyebrow,
  sub,
  children,
}: {
  eyebrow: string;
  sub: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ paddingTop: 22, marginTop: 22, borderTop: "1px solid var(--ink-150)" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-400)", marginBottom: 14, lineHeight: 1.5 }}>{sub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
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

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 3, padding: 3, background: "var(--ink-100)", borderRadius: "var(--r-sm)" }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              border: 0,
              cursor: "pointer",
              padding: "7px 8px",
              borderRadius: 5,
              fontSize: 12.5,
              fontWeight: 560,
              background: active ? "var(--white)" : "transparent",
              color: active ? "var(--ink-900)" : "var(--ink-500)",
              boxShadow: active ? "var(--shadow-xs)" : "none",
              transition: "all .14s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PreviewStars() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 4, fontSize: 24, color: "var(--ink-300)", lineHeight: 1 }}>
      {"★★★★★".split("").map((s, i) => (
        <span key={i}>{s}</span>
      ))}
    </div>
  );
}

export function FunnelBuilderForm({
  locations,
  selectedLocation,
  defaultValues,
}: {
  locations: LocationOption[];
  selectedLocation: { id: string; name: string; slug: string; reviewLink: string | null };
  defaultValues: FunnelDefaults;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveFunnelBuilderSettings, initialState);
  const [cfg, setCfg] = useState(defaultValues);
  const set = (k: keyof FunnelDefaults, v: string) => setCfg((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (state.success) {
      window.location.assign(
        `/funnel-builder?location=${selectedLocation.id}&flash=Funnel+settings+saved&tone=success`,
      );
    }
  }, [selectedLocation.id, state.success]);

  const liveRoute = `/f/${selectedLocation.slug}`;
  const previewRoute = `/funnel-preview?location=${selectedLocation.id}`;

  return (
    <form action={formAction} style={{ maxWidth: 1240, margin: "0 auto", padding: "var(--gutter)" }}>
      <input type="hidden" name="locationId" value={selectedLocation.id} />
      <input type="hidden" name="funnelRatingStyle" value={cfg.funnelRatingStyle} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: "var(--gutter)" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Funnel Setup</div>
          <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-.025em" }}>Funnel Builder</h1>
          <p style={{ fontSize: 13.5, color: "var(--ink-500)", marginTop: 5 }}>
            Define what customers see first and where each rating routes them.
          </p>
        </div>
        <FormSubmitButton
          idleLabel="Save changes"
          pendingLabel="Saving…"
          className="btn btn-primary"
        />
      </div>

      {/* Editing bar */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: "var(--gutter)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-500)" }}>Editing</span>
        <select
          value={selectedLocation.id}
          onChange={(e) => router.push(`/funnel-builder?location=${e.target.value}`)}
          style={{ ...inputStyle, width: "auto", minWidth: 220, fontWeight: 620 }}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} — {l.city}, {l.state}
            </option>
          ))}
        </select>
        <span className="tnum" style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-400)" }}>{liveRoute}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a href={previewRoute} className="btn btn-secondary btn-sm"><Icon name="eye" size={13} />Preview</a>
          <a href={liveRoute} className="btn btn-secondary btn-sm"><Icon name="external" size={13} />Open live funnel</a>
        </div>
      </div>

      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: "var(--gutter)", alignItems: "start" }}>
        {/* Main configuration card */}
        <div className="card" style={{ padding: "var(--card-pad)" }}>
          <SecHead title="What customers see first" sub="The funnel entry page and first impression." />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            <FBField label="Prompt title">
              <input name="funnelPromptTitle" style={inputStyle} value={cfg.funnelPromptTitle} onChange={(e) => set("funnelPromptTitle", e.target.value)} />
            </FBField>
            <FBField label="Prompt body">
              <textarea name="funnelPromptBody" style={textareaStyle} value={cfg.funnelPromptBody} onChange={(e) => set("funnelPromptBody", e.target.value)} />
            </FBField>
            <FBField label="Rating style">
              <Segmented
                value={cfg.funnelRatingStyle}
                onChange={(v) => set("funnelRatingStyle", v)}
                options={[
                  { value: "stars", label: "★ Stars" },
                  { value: "faces", label: "🙂 Faces" },
                  { value: "thumbs", label: "👍 Thumbs" },
                ]}
              />
            </FBField>
          </div>

          <FBSection
            eyebrow="Routing"
            sub={
              <>
                Where low and high ratings go — Google, Facebook, WeHearYou, or a custom link — is configured in{" "}
                <a href="/campaign-wizard" style={{ color: "var(--accent-strong)", fontWeight: 600 }}>
                  Campaign Wizard → Review Routing
                </a>
                .
              </>
            }
          >
            <FBField label="Public review button label">
              <input name="funnelReviewButtonLabel" style={inputStyle} value={cfg.funnelReviewButtonLabel} onChange={(e) => set("funnelReviewButtonLabel", e.target.value)} />
            </FBField>
          </FBSection>

          <FBSection eyebrow="Private feedback" sub="Shown when a rating falls below the routing threshold and stays private.">
            <FBField label="Title">
              <input name="funnelPrivateTitle" style={inputStyle} value={cfg.funnelPrivateTitle} onChange={(e) => set("funnelPrivateTitle", e.target.value)} />
            </FBField>
            <FBField label="Body">
              <textarea name="funnelPrivateBody" style={textareaStyle} value={cfg.funnelPrivateBody} onChange={(e) => set("funnelPrivateBody", e.target.value)} />
            </FBField>
            <FBField label="Submit button label">
              <input name="funnelPrivateSubmitLabel" style={inputStyle} value={cfg.funnelPrivateSubmitLabel} onChange={(e) => set("funnelPrivateSubmitLabel", e.target.value)} />
            </FBField>
          </FBSection>

          <FBSection eyebrow="Thank-you states" sub="Shown after a customer completes either branch.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FBField label="Public thank-you title">
                <input name="funnelThanksPublicTitle" style={inputStyle} value={cfg.funnelThanksPublicTitle} onChange={(e) => set("funnelThanksPublicTitle", e.target.value)} />
              </FBField>
              <FBField label="Private thank-you title">
                <input name="funnelThanksPrivateTitle" style={inputStyle} value={cfg.funnelThanksPrivateTitle} onChange={(e) => set("funnelThanksPrivateTitle", e.target.value)} />
              </FBField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FBField label="Public thank-you body">
                <textarea name="funnelThanksPublicBody" style={textareaStyle} value={cfg.funnelThanksPublicBody} onChange={(e) => set("funnelThanksPublicBody", e.target.value)} />
              </FBField>
              <FBField label="Private thank-you body">
                <textarea name="funnelThanksPrivateBody" style={textareaStyle} value={cfg.funnelThanksPrivateBody} onChange={(e) => set("funnelThanksPrivateBody", e.target.value)} />
              </FBField>
            </div>
          </FBSection>

          {state.error ? (
            <div style={{ marginTop: 18, padding: "11px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--danger-soft)", background: "color-mix(in srgb, var(--danger) 8%, var(--white))", color: "var(--danger)", fontSize: 13 }}>
              {state.error}
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)", position: "sticky", top: "var(--gutter)" }}>
          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Live links" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-400)", marginBottom: 3 }}>Live funnel route</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--ink-100)", padding: "8px 10px", borderRadius: "var(--r-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{liveRoute}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-400)", marginBottom: 3 }}>Preview route</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--ink-100)", padding: "8px 10px", borderRadius: "var(--r-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewRoute}</div>
              </div>
              {selectedLocation.reviewLink ? null : (
                <div style={{ fontSize: 11.5, color: "var(--warning)", lineHeight: 1.5 }}>
                  No public review destination set. Configure it in Location Settings.
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              <a href={previewRoute} className="btn btn-primary btn-sm" style={{ justifyContent: "center" }}><Icon name="eye" size={13} />Open preview</a>
              <a href={liveRoute} className="btn btn-secondary btn-sm" style={{ justifyContent: "center" }}><Icon name="external" size={13} />Open live funnel</a>
            </div>
          </div>

          <div className="card" style={{ padding: "var(--card-pad)" }}>
            <SecHead title="Preview" />
            <div style={{ marginTop: 14, borderRadius: "var(--r-md)", border: "1px solid var(--ink-150)", padding: 18, textAlign: "center", background: "var(--ink-50)" }}>
              <div style={{ fontSize: 13, fontWeight: 640, marginBottom: 6 }}>{cfg.funnelPromptTitle}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-500)", lineHeight: 1.5, marginBottom: 14 }}>{cfg.funnelPromptBody}</div>
              {cfg.funnelRatingStyle === "faces" ? (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, fontSize: 24 }}>😞 😐 😊</div>
              ) : cfg.funnelRatingStyle === "thumbs" ? (
                <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 22 }}>👎 👍</div>
              ) : (
                <PreviewStars />
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
