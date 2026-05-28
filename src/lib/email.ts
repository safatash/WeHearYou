import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export function isEmailSendingConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendReviewRequestEmail({
  to,
  subject,
  recipientName,
  locationName,
  reviewUrl,
}: {
  to: string;
  subject: string;
  recipientName: string;
  locationName: string;
  reviewUrl: string;
}) {
  const config = getResendConfig();

  if (!config.apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(config.apiKey);

  await resend.emails.send({
    from: config.from,
    to,
    subject: subject || `How was your experience with ${locationName}?`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto;">
        <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #4f46e5; font-weight: 700;">Review Request</p>
        <h1 style="font-size: 28px; line-height: 1.2; margin: 16px 0;">How was your experience with ${locationName}?</h1>
        <p>Hi ${recipientName}, thanks for choosing ${locationName}. We'd really appreciate your feedback.</p>
        <p>Please use the secure link below to rate your experience.</p>
        <p style="margin: 32px 0;">
          <a href="${reviewUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 14px; font-weight: 700;">
            Leave Feedback
          </a>
        </p>
        <p style="font-size: 14px; color: #475569;">If the button doesn't work, copy and paste this link:</p>
        <p style="font-size: 14px; color: #475569; word-break: break-all;">${reviewUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Powered by WeHearYou</p>
      </div>
    `,
  });
}

export async function sendTeamNotificationEmail({
  to,
  contactName,
  locationName,
  eventType,
}: {
  to: string;
  contactName: string;
  locationName: string;
  eventType: string;
}) {
  const config = getResendConfig();
  if (!config.apiKey) return;

  const resend = new Resend(config.apiKey);
  const safeContactName = escapeHtml(contactName);
  const safeLocationName = escapeHtml(locationName);
  const safeEventType = escapeHtml(eventType.replace(/_/g, " "));

  await resend.emails.send({
    from: config.from,
    to,
    subject: `Team alert: ${safeEventType} at ${safeLocationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto;">
        <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #4f46e5; font-weight: 700;">WeHearYou Automation</p>
        <h1 style="font-size: 24px; line-height: 1.2; margin: 16px 0;">Team notification</h1>
        <p><strong>${safeContactName}</strong> triggered a <strong>${safeEventType}</strong> event at <strong>${safeLocationName}</strong>.</p>
        <p style="font-size: 14px; color: #64748b; margin-top: 24px;">This is an automated notification from WeHearYou.</p>
      </div>
    `,
  });
}

export async function sendVideoTestimonialRequestEmail({
  to,
  recipientName,
  locationName,
  recorderUrl,
  prompt,
}: {
  to: string;
  recipientName: string;
  locationName: string;
  recorderUrl: string;
  prompt?: string;
}) {
  const config = getResendConfig();

  if (!config.apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(config.apiKey);

  await resend.emails.send({
    from: config.from,
    to,
    subject: `Share your experience with ${locationName} on video`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto;">
        <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #4f46e5; font-weight: 700;">Video Testimonial Request</p>
        <h1 style="font-size: 28px; line-height: 1.2; margin: 16px 0;">We'd love to hear from you, ${escapeHtml(recipientName)}!</h1>
        <p>Hi ${escapeHtml(recipientName)}, thanks for choosing ${escapeHtml(locationName)}. Would you mind recording a short video sharing your experience?</p>
        <p>It only takes 30–60 seconds and means the world to us.</p>
        ${prompt ? `<div style="border-left:3px solid #4f46e5;background:#eef2ff;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;font-style:italic;color:#3730a3;">${escapeHtml(prompt)}</div>` : ''}
        <p style="margin: 32px 0;">
          <a href="${escapeHtml(recorderUrl)}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 14px; font-weight: 700;">
            Record My Testimonial 🎥
          </a>
        </p>
        <p style="font-size: 14px; color: #475569;">If the button doesn't work, copy and paste this link:</p>
        <p style="font-size: 14px; color: #475569; word-break: break-all;">${escapeHtml(recorderUrl)}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Powered by WeHearYou</p>
      </div>
    `,
  });
}
