import type { ReactNode } from "react";
import { Icon } from "@/components/icon";

interface SendSummaryProps {
  type: string;
  location: string;
  channels: { sms: boolean; email: boolean };
  recipients: number;
}

function SumRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--ink-150)" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-400)", width: 92, flex: "none" }}>{label}</span>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 540, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "flex-end", textAlign: "right" }}>
        {children}
      </div>
    </div>
  );
}

export function SendSummary({ type, location, channels, recipients }: SendSummaryProps) {
  const anyChannel = channels.sms || channels.email;
  const estimatedSends = recipients * ((channels.sms ? 1 : 0) + (channels.email ? 1 : 0));

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Send summary</div>
      <SumRow label="Type">
        <span className="badge badge-accent">{type}</span>
      </SumRow>
      <SumRow label="Location">
        <span style={{ color: "var(--ink-700)" }}>{location}</span>
      </SumRow>
      <SumRow label="Channels">
        {channels.sms ? <span className="badge badge-neutral"><Icon name="chat" size={11} />SMS</span> : null}
        {channels.email ? <span className="badge badge-neutral"><Icon name="send" size={11} />Email</span> : null}
        {!anyChannel ? <span style={{ color: "var(--danger)", fontSize: 12.5 }}>None</span> : null}
      </SumRow>
      <SumRow label="Recipients">
        <span className="tnum" style={{ fontWeight: 680, fontSize: 15, color: recipients ? "var(--ink-900)" : "var(--danger)" }}>{recipients}</span>
      </SumRow>
      <SumRow label="Est. sends">
        <span className="tnum" style={{ color: "var(--ink-600)" }}>{estimatedSends}</span>
      </SumRow>
    </div>
  );
}
