import nodemailer from "nodemailer";

function getMailConfig() {
  return {
    host: process.env.MAILTRAP_HOST ?? "",
    port: Number(process.env.MAILTRAP_PORT ?? "587"),
    user: process.env.MAILTRAP_USERNAME ?? "",
    pass: process.env.MAILTRAP_PASSWORD ?? "",
    from: process.env.MAIL_FROM ?? "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export function isEmailSendingConfigured() {
  const config = getMailConfig();
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
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
  const config = getMailConfig();

  if (!isEmailSendingConfigured()) {
    throw new Error("Email sending is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto;">
      <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #4f46e5; font-weight: 700;">WeHearYou Review Request</p>
      <h1 style="font-size: 28px; line-height: 1.2; margin: 16px 0;">How was your experience with ${locationName}?</h1>
      <p>Hi ${recipientName}, thanks for choosing ${locationName}. We'd really appreciate your feedback.</p>
      <p>Please use the secure link below to rate your experience.</p>
      <p style="margin: 32px 0;">
        <a href="${reviewUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 14px; font-weight: 700;">
          Leave Feedback
        </a>
      </p>
      <p style="font-size: 14px; color: #475569;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 14px; color: #475569; word-break: break-all;">${reviewUrl}</p>
    </div>
  `;

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text: `Hi ${recipientName}, thanks for choosing ${locationName}. Please share your feedback here: ${reviewUrl}`,
    html,
  });
}
