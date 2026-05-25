import twilio from "twilio";

function getTwilioConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
  };
}

export function isSMSSendingConfigured() {
  const config = getTwilioConfig();
  return Boolean(config.accountSid && config.authToken && config.phoneNumber);
}

export async function sendSMS({ to, body }: { to: string; body: string }) {
  const config = getTwilioConfig();

  if (!isSMSSendingConfigured()) {
    throw new Error("Twilio is not configured");
  }

  const client = twilio(config.accountSid, config.authToken);

  await client.messages.create({
    from: config.phoneNumber,
    to,
    body,
  });
}

export async function sendReviewRequestSMS({
  to,
  recipientName,
  locationName,
  reviewUrl,
  messageBody,
}: {
  to: string;
  recipientName: string;
  locationName: string;
  reviewUrl: string;
  messageBody?: string | null;
}) {
  const body = messageBody
    ? messageBody.replace("{name}", recipientName).replace("{location}", locationName).replace("{url}", reviewUrl)
    : `Hi ${recipientName}, thanks for visiting ${locationName}! We'd love your feedback: ${reviewUrl}`;

  await sendSMS({ to, body });
}

export async function sendVideoTestimonialRequestSMS({
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
  const promptPart = prompt ? ` "${prompt}"` : "";
  const body = `Hi ${recipientName}, ${locationName} would love a short video testimonial from you!${promptPart} Record here (90 sec): ${recorderUrl}`;
  await sendSMS({ to, body });
}
