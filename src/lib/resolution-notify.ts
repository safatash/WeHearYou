/**
 * Best-effort business notifications for resolution cases. Never throws — a
 * failed/ unconfigured email or SMS must never block the customer's submission.
 * Reuses the Resend + Twilio infrastructure.
 */
import { Resend } from "resend";
import { sendSMS, isSMSSendingConfigured } from "@/lib/sms";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifyResolutionCase(params: {
  emails: string[];
  smsRecipients: string[];
  customerName: string | null;
  locationName: string;
  rating: number;
  priority: string;
  summary: string;
  caseUrl: string;
}): Promise<void> {
  const customer = params.customerName?.trim() || "A customer";

  // Email (Resend) — no-op when unconfigured
  const apiKey = process.env.RESEND_API_KEY ?? "";
  if (apiKey && params.emails.length > 0) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
        to: params.emails,
        subject: `[${params.priority}] New customer feedback at ${params.locationName} (${params.rating}★)`,
        html: `
          <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a">
            <h2 style="margin:0 0 8px">New customer feedback — ${esc(params.locationName)}</h2>
            <p style="margin:0 0 4px"><strong>${esc(customer)}</strong> · ${params.rating}★ · Priority: <strong>${esc(params.priority)}</strong></p>
            <p style="margin:12px 0;padding:12px 14px;background:#f8fafc;border-radius:10px">${esc(params.summary)}</p>
            <p><a href="${params.caseUrl}" style="color:#2a8a92;font-weight:600">Open case →</a></p>
          </div>`,
      });
    } catch (err) {
      console.error("Resolution email notification failed:", err);
    }
  }

  // SMS (Twilio) — best-effort per recipient
  if (isSMSSendingConfigured() && params.smsRecipients.length > 0) {
    const body = `New ${params.priority} feedback (${params.rating}★) at ${params.locationName} from ${customer}. View: ${params.caseUrl}`;
    for (const to of params.smsRecipients) {
      try {
        await sendSMS({ to, body });
      } catch (err) {
        console.error("Resolution SMS notification failed:", err);
      }
    }
  }
}
