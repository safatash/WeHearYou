import crypto from "node:crypto";
import { AutomationStepType, AutomationTriggerType, CampaignStatus, ContactSource, PreferredChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendReviewRequestEmail } from "@/lib/email";

export type AutomationWebhookEventType = "appointment_completed" | "project_completed";

export type AutomationWebhookPayload = {
  eventType: AutomationWebhookEventType;
  locationId: string;
  contact: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    preferredChannel?: "SMS" | "EMAIL" | null;
    notes?: string | null;
  };
  metadata?: {
    occurredAt?: string | null;
    source?: string | null;
    workflowName?: string | null;
    destination?: string | null;
    messageBody?: string | null;
    emailSubject?: string | null;
  } | null;
};

export type AutomationExecutionResult = {
  automationId: string;
  automationName: string;
  campaignId: string | null;
  contactId: string;
  locationId: string;
  automationRunId: string;
  stepsExecuted: Array<{
    stepId: string;
    stepType: AutomationStepType;
    status: "executed" | "skipped" | "scheduled";
    detail: string;
  }>;
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildContactName(contact: AutomationWebhookPayload["contact"]) {
  const firstName = normalizeText(contact.firstName);
  const lastName = normalizeText(contact.lastName);
  const explicitName = normalizeText(contact.name);
  const email = normalizeText(contact.email);
  const phone = normalizeText(contact.phone);

  if (explicitName) {
    return explicitName;
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || email || phone || "Unnamed Contact";
}

function mapEventTypeToTriggerType(eventType: AutomationWebhookEventType): AutomationTriggerType {
  switch (eventType) {
    case "appointment_completed":
      return AutomationTriggerType.APPOINTMENT_COMPLETED;
    case "project_completed":
      return AutomationTriggerType.PROJECT_COMPLETED;
    default:
      return AutomationTriggerType.WEBHOOK_EVENT;
  }
}

function parsePreferredChannel(value: string | null | undefined) {
  return value === "EMAIL" ? PreferredChannel.EMAIL : PreferredChannel.SMS;
}

function coerceStepConfig(config: Prisma.JsonValue | null): Record<string, string> {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, typeof value === "string" ? value : String(value)])
  );
}

function getOccurredAt(payload: AutomationWebhookPayload) {
  const occurredAt = normalizeText(payload.metadata?.occurredAt);

  if (!occurredAt) {
    return new Date();
  }

  const parsed = new Date(occurredAt);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getDelayMs(config: Record<string, string>) {
  const delayHours = Number(config.delayHours ?? "");
  if (Number.isFinite(delayHours) && delayHours > 0) {
    return delayHours * 60 * 60 * 1000;
  }

  const delayMinutes = Number(config.delayMinutes ?? "");
  if (Number.isFinite(delayMinutes) && delayMinutes > 0) {
    return delayMinutes * 60 * 1000;
  }

  const delayRaw = Number(config.delay ?? "");
  if (Number.isFinite(delayRaw) && delayRaw > 0) {
    return delayRaw * 60 * 1000;
  }

  return 0;
}

async function sendCampaignEmails({
  recipients,
  emailSubject,
  locationName,
}: {
  recipients: Array<{ token: string; contact: { name: string; email: string | null } }>;
  emailSubject: string | null;
  locationName: string;
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

async function upsertWebhookContact(payload: AutomationWebhookPayload) {
  const normalizedEmail = normalizeText(payload.contact.email);
  const normalizedPhone = normalizeText(payload.contact.phone);
  const normalizedFirstName = normalizeText(payload.contact.firstName);
  const normalizedLastName = normalizeText(payload.contact.lastName);
  const normalizedNotes = normalizeText(payload.contact.notes);
  const preferredChannel = parsePreferredChannel(payload.contact.preferredChannel);
  const name = buildContactName(payload.contact);

  if (payload.contact.id) {
    const existing = await prisma.contact.findUnique({
      where: { id: payload.contact.id },
      select: { id: true },
    });

    if (existing) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: {
          locationId: payload.locationId,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          name,
          email: normalizedEmail,
          phone: normalizedPhone,
          notes: normalizedNotes,
          preferredChannel,
          source: ContactSource.WEBHOOK,
        },
      });
    }
  }

  const emailOrPhoneConditions: Prisma.ContactWhereInput[] = [];

  if (normalizedEmail) {
    emailOrPhoneConditions.push({ email: normalizedEmail });
  }

  if (normalizedPhone) {
    emailOrPhoneConditions.push({ phone: normalizedPhone });
  }

  const existingByEmailOrPhone = emailOrPhoneConditions.length
    ? await prisma.contact.findFirst({
        where: {
          locationId: payload.locationId,
          OR: emailOrPhoneConditions,
        },
      })
    : null;

  if (existingByEmailOrPhone) {
    return prisma.contact.update({
      where: { id: existingByEmailOrPhone.id },
      data: {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        name,
        email: normalizedEmail,
        phone: normalizedPhone,
        notes: normalizedNotes ?? existingByEmailOrPhone.notes,
        preferredChannel,
        source: ContactSource.WEBHOOK,
      },
    });
  }

  return prisma.contact.create({
    data: {
      locationId: payload.locationId,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      notes: normalizedNotes,
      preferredChannel,
      source: ContactSource.WEBHOOK,
    },
  });
}

async function createCampaignFromStep({
  automationRunId,
  step,
  payload,
  contact,
  location,
}: {
  automationRunId: string;
  step: {
    id: string;
    stepType: AutomationStepType;
    title: string;
    configJson: Prisma.JsonValue | null;
  };
  payload: AutomationWebhookPayload;
  contact: { id: string; name: string; email: string | null };
  location: { id: string; name: string };
}) {
  const config = coerceStepConfig(step.configJson);
  const channel = parsePreferredChannel(config.channel ?? payload.contact.preferredChannel ?? null);
  const sentAt = new Date();
  const token = `rr_tok_${crypto.randomBytes(6).toString("hex")}`;
  const workflowName =
    normalizeText(payload.metadata?.workflowName) ??
    normalizeText(step.title) ??
    `${payload.eventType.replace(/_/g, " ")} automation`;
  const messageBody = normalizeText(payload.metadata?.messageBody) ?? normalizeText(config.messageBody) ?? null;
  const emailSubject = normalizeText(payload.metadata?.emailSubject) ?? normalizeText(config.emailSubject) ?? null;
  const destination =
    normalizeText(payload.metadata?.destination) ??
    normalizeText(config.destination) ??
    "4-5 stars redirect to Google, 1-3 stars collect private feedback";

  const campaign = await prisma.campaign.create({
    data: {
      locationId: location.id,
      name: step.title || `${location.name} automated request`,
      channel,
      status: CampaignStatus.SENT,
      workflowName,
      sendAt: sentAt,
      messageBody,
      emailSubject,
      destination,
      recipients: {
        create: {
          contactId: contact.id,
          token,
          status: CampaignStatus.SENT,
          outcome: channel === PreferredChannel.EMAIL ? "Email queued by automation" : "SMS token created by automation",
          sentAt,
        },
      },
    },
    include: {
      recipients: {
        include: {
          contact: true,
        },
      },
    },
  });

  if (channel === PreferredChannel.EMAIL) {
    await sendCampaignEmails({
      recipients: campaign.recipients.map((recipient) => ({ token: recipient.token, contact: recipient.contact })),
      emailSubject,
      locationName: location.name,
    });
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      lastInvitedAt: sentAt,
    },
  });

  await prisma.automationRun.update({
    where: { id: automationRunId },
    data: {
      status: "completed",
    },
  });

  return {
    campaignId: campaign.id,
    detail: `Created ${channel.toLowerCase()} campaign ${campaign.id} for contact ${contact.id}`,
  };
}

export async function executePendingAutomationJobs(limit = 25) {
  const dueJobs = await prisma.automationJob.findMany({
    where: {
      status: "pending",
      executeAt: {
        lte: new Date(),
      },
    },
    include: {
      automationStep: true,
      automationRun: {
        include: {
          contact: true,
          location: true,
        },
      },
    },
    orderBy: {
      executeAt: "asc",
    },
    take: limit,
  });

  const results: Array<{ jobId: string; status: "executed" | "failed"; detail: string; campaignId?: string | null }> = [];

  for (const job of dueJobs) {
    try {
      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: "processing",
        },
      });

      if (job.automationStep.stepType !== AutomationStepType.SEND_REQUEST) {
        await prisma.automationJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            executedAt: new Date(),
          },
        });

        results.push({
          jobId: job.id,
          status: "executed",
          detail: `Skipped unsupported queued step type ${job.automationStep.stepType}`,
        });
        continue;
      }

      const payload = (job.automationRun.payloadJson ?? {}) as AutomationWebhookPayload;
      const outcome = await createCampaignFromStep({
        automationRunId: job.automationRunId,
        step: job.automationStep,
        payload,
        contact: job.automationRun.contact,
        location: job.automationRun.location,
      });

      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          executedAt: new Date(),
          errorMessage: null,
        },
      });

      results.push({
        jobId: job.id,
        status: "executed",
        detail: outcome.detail,
        campaignId: outcome.campaignId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled automation job failed";

      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: message,
        },
      });

      await prisma.automationRun.update({
        where: { id: job.automationRunId },
        data: {
          status: "failed",
        },
      });

      results.push({
        jobId: job.id,
        status: "failed",
        detail: message,
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
}

export async function executeAutomationWebhook(payload: AutomationWebhookPayload): Promise<AutomationExecutionResult> {
  const triggerType = mapEventTypeToTriggerType(payload.eventType);

  const [location, automation] = await Promise.all([
    prisma.location.findUnique({
      where: { id: payload.locationId },
      select: { id: true, name: true },
    }),
    prisma.automation.findFirst({
      where: {
        isActive: true,
        triggerType,
      },
      include: {
        steps: {
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  if (!location) {
    throw new Error("Location not found");
  }

  if (!automation) {
    throw new Error(`No active automation found for trigger ${triggerType}`);
  }

  const contact = await upsertWebhookContact(payload);

  const automationRun = await prisma.automationRun.create({
    data: {
      automationId: automation.id,
      locationId: location.id,
      contactId: contact.id,
      triggerEvent: payload.eventType,
      source: normalizeText(payload.metadata?.source) ?? "webhook",
      status: "running",
      payloadJson: payload as Prisma.InputJsonValue,
    },
  });

  const stepsExecuted: AutomationExecutionResult["stepsExecuted"] = [];
  let createdCampaignId: string | null = null;
  let scheduledAt: Date | null = null;

  for (const step of automation.steps) {
    const config = coerceStepConfig(step.configJson);

    if (step.stepType === AutomationStepType.DELAY) {
      const delayMs = getDelayMs(config);
      scheduledAt = new Date(getOccurredAt(payload).getTime() + delayMs);
      stepsExecuted.push({
        stepId: step.id,
        stepType: step.stepType,
        status: "scheduled",
        detail: `Delay queued until ${scheduledAt.toISOString()}`,
      });
      continue;
    }

    if (step.stepType === AutomationStepType.SEND_REQUEST) {
      if (scheduledAt) {
        await prisma.automationJob.create({
          data: {
            automationRunId: automationRun.id,
            automationStepId: step.id,
            status: "pending",
            executeAt: scheduledAt,
            payloadJson: payload as Prisma.InputJsonValue,
          },
        });

        await prisma.automationRun.update({
          where: { id: automationRun.id },
          data: {
            status: "scheduled",
          },
        });

        stepsExecuted.push({
          stepId: step.id,
          stepType: step.stepType,
          status: "scheduled",
          detail: `Send request scheduled for ${scheduledAt.toISOString()}`,
        });
      } else {
        const outcome = await createCampaignFromStep({
          automationRunId: automationRun.id,
          step,
          payload,
          contact,
          location,
        });

        createdCampaignId = outcome.campaignId;
        stepsExecuted.push({
          stepId: step.id,
          stepType: step.stepType,
          status: "executed",
          detail: outcome.detail,
        });
      }
      continue;
    }

    stepsExecuted.push({
      stepId: step.id,
      stepType: step.stepType,
      status: "skipped",
      detail: "Step type not implemented yet",
    });
  }

  return {
    automationId: automation.id,
    automationName: automation.name,
    campaignId: createdCampaignId,
    contactId: contact.id,
    locationId: location.id,
    automationRunId: automationRun.id,
    stepsExecuted,
  };
}
