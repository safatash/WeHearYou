"use server";

import crypto from "node:crypto";
import { CampaignStatus, ContactSource, PreferredChannel } from "@prisma/client";
import { redirect } from "next/navigation";
import { sendReviewRequestEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { requireContactManagement } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

function normalize(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function parseChannels(values: FormDataEntryValue[]) {
  const normalized = values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value): value is "SMS" | "EMAIL" => value === "SMS" || value === "EMAIL");

  return Array.from(new Set(normalized)).map((value) => (value === "EMAIL" ? PreferredChannel.EMAIL : PreferredChannel.SMS));
}

async function sendCampaignEmailInvites({
  locationName,
  emailSubject,
  recipients,
}: {
  locationName: string;
  emailSubject: string | null;
  recipients: Array<{ token: string; contact: { name: string; email: string | null } }>;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const recipient of recipients) {
    if (!recipient.contact.email) {
      continue;
    }

    await sendReviewRequestEmail({
      to: recipient.contact.email,
      subject: emailSubject ?? `How was your experience with ${locationName}?`,
      recipientName: recipient.contact.name,
      locationName,
      reviewUrl: `${appUrl}/r/${recipient.token}`,
    });
  }
}

export async function createCampaign(formData: FormData) {
  const campaignName = normalize(formData.get("name")) ?? "Manual review request";
  const allowedLocationIds = await getCurrentAccessibleLocationIds();
  const locationId = normalize(formData.get("locationId"));
  const channels = parseChannels(formData.getAll("channels"));
  const workflowName = normalize(formData.get("workflowName")) ?? "Manual send";
  const emailSubject = normalize(formData.get("emailSubject"));
  const messageBody = normalize(formData.get("messageBody"));
  const destination = normalize(formData.get("destination"));
  const selectedContacts = formData
    .getAll("contactIds")
    .map((value) => (typeof value === "string" ? value : ""))
    .filter(Boolean);

  if (!locationId) {
    throw new Error("Location is required.");
  }

  if (!selectedContacts.length) {
    throw new Error("Select at least one contact.");
  }

  if (!channels.length) {
    throw new Error("Select at least one request channel.");
  }

  await requireContactManagement(locationId);

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      ...(allowedLocationIds.length > 0 ? { id: { in: allowedLocationIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      publicProfile: {
        select: { funnelPromptTitle: true },
      },
    },
  });

  if (!location) {
    throw new Error("Location not found.");
  }

  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: selectedContacts },
      ...(allowedLocationIds.length > 0 ? { locationId: { in: allowedLocationIds } } : {}),
      locationId,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!contacts.length) {
    throw new Error("Selected contacts were not found.");
  }

  const sentAt = new Date();
  const campaigns: Array<{ id: string; channel: PreferredChannel }> = [];

  for (const channel of channels) {
    const recipientTokens = contacts.map((contact) => ({
      contactId: contact.id,
      token: `rr_tok_${crypto.randomBytes(6).toString("hex")}`,
      status: CampaignStatus.SENT,
      outcome: channel === PreferredChannel.EMAIL ? "Email queued" : "SMS queued",
      sentAt,
    }));

    const campaign = await prisma.campaign.create({
      data: {
        locationId,
        name: channels.length > 1 ? `${campaignName} (${channel})` : campaignName,
        channel,
        status: CampaignStatus.SENT,
        workflowName,
        sendAt: sentAt,
        emailSubject,
        messageBody,
        destination,
        recipients: {
          create: recipientTokens,
        },
      },
      select: {
        id: true,
        channel: true,
      },
    });

    campaigns.push(campaign);

    if (channel === PreferredChannel.EMAIL) {
      await sendCampaignEmailInvites({
        locationName: location.name,
        emailSubject: emailSubject ?? location.publicProfile?.funnelPromptTitle ?? null,
        recipients: recipientTokens.map((recipient) => ({
          token: recipient.token,
          contact: contacts.find((entry) => entry.id === recipient.contactId)!,
        })),
      });
    }
  }

  await prisma.contact.updateMany({
    where: {
      id: {
        in: contacts.map((contact) => contact.id),
      },
    },
    data: {
      lastInvitedAt: sentAt,
    },
  });

  if (campaigns.length > 1) {
    const links = campaigns.map((campaign) => `${campaign.channel}:${campaign.id}`).join(",");
    redirect(`/campaigns?flash=${encodeURIComponent(`Created ${campaigns.length} campaigns: ${campaigns.map((campaign) => campaign.channel).join(" and ")}`)}&tone=success&created=${encodeURIComponent(links)}`);
  }

  redirect(`/campaigns/${campaigns[0]?.id}?flash=${encodeURIComponent(`${campaigns[0]?.channel} campaign created`)}&tone=success`);
}

export async function quickCreateContact(formData: FormData): Promise<{
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}> {
  const name = normalize(formData.get("name"));
  const email = normalize(formData.get("email"));
  const phone = normalize(formData.get("phone"));
  const locationId = normalize(formData.get("locationId"));
  const allowedLocationIds = await getCurrentAccessibleLocationIds();

  if (!name) throw new Error("Name is required.");
  if (!email && !phone) throw new Error("Email or phone is required.");
  if (!locationId) throw new Error("Location is required.");
  if (allowedLocationIds.length > 0 && !allowedLocationIds.includes(locationId)) {
    throw new Error("Access denied.");
  }

  await requireContactManagement(locationId);

  return prisma.contact.create({
    data: {
      locationId,
      name,
      email,
      phone,
      source: ContactSource.MANUAL,
      preferredChannel: email ? PreferredChannel.EMAIL : PreferredChannel.SMS,
    },
    select: { id: true, name: true, email: true, phone: true },
  });
}

export async function resendCampaignInvites(formData: FormData) {
  const campaignId = normalize(formData.get("campaignId"));

  if (!campaignId) {
    throw new Error("Campaign is required.");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      location: {
        select: {
          name: true,
        },
      },
      recipients: {
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  await requireContactManagement(campaign.locationId);

  if (campaign.channel !== PreferredChannel.EMAIL) {
    throw new Error("Only email campaigns can be resent right now.");
  }

  await sendCampaignEmailInvites({
    locationName: campaign.location.name,
    emailSubject: campaign.emailSubject,
    recipients: campaign.recipients.map((recipient) => ({
      token: recipient.token,
      contact: recipient.contact,
    })),
  });

  const resentAt = new Date();

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      sendAt: resentAt,
      recipients: {
        updateMany: {
          where: {},
          data: {
            sentAt: resentAt,
            outcome: "Email resent",
            status: CampaignStatus.SENT,
          },
        },
      },
    },
  });

  await prisma.contact.updateMany({
    where: {
      id: {
        in: campaign.recipients.map((recipient) => recipient.contact.id),
      },
    },
    data: {
      lastInvitedAt: resentAt,
    },
  });

  redirect(`/campaigns/${campaign.id}`);
}
