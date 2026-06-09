import crypto from "node:crypto";
import { AutomationStepType, AutomationTriggerType, CampaignStatus, ContactSource, PreferredChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendReviewRequestEmail, sendTeamNotificationEmail, isEmailSendingConfigured } from "@/lib/email";
import { sendReviewRequestSMS, isSMSSendingConfigured } from "@/lib/sms";
import { getValidGoogleAccessToken } from "@/lib/google-oauth";
import { publishGbpReply } from "@/lib/gbp-api";

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
    status: "executed" | "skipped" | "scheduled" | "failed";
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

  if (explicitName) return explicitName;
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
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, typeof value === "string" ? value : String(value)])
  );
}

function getOccurredAt(payload: AutomationWebhookPayload) {
  const occurredAt = normalizeText(payload.metadata?.occurredAt);
  if (!occurredAt) return new Date();
  const parsed = new Date(occurredAt);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getDelayMs(config: Record<string, string>) {
  const delayHours = Number(config.delayHours ?? "");
  if (Number.isFinite(delayHours) && delayHours > 0) return delayHours * 60 * 60 * 1000;
  const delayMinutes = Number(config.delayMinutes ?? "");
  if (Number.isFinite(delayMinutes) && delayMinutes > 0) return delayMinutes * 60 * 1000;
  const delayRaw = Number(config.delay ?? "");
  if (Number.isFinite(delayRaw) && delayRaw > 0) return delayRaw * 60 * 1000;
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
    if (!recipient.contact.email) continue;
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
        data: { locationId: payload.locationId, firstName: normalizedFirstName, lastName: normalizedLastName, name, email: normalizedEmail, phone: normalizedPhone, notes: normalizedNotes, preferredChannel, source: ContactSource.WEBHOOK },
      });
    }
  }

  const emailOrPhoneConditions: Prisma.ContactWhereInput[] = [];
  if (normalizedEmail) emailOrPhoneConditions.push({ email: normalizedEmail });
  if (normalizedPhone) emailOrPhoneConditions.push({ phone: normalizedPhone });

  const existingByEmailOrPhone = emailOrPhoneConditions.length
    ? await prisma.contact.findFirst({ where: { locationId: payload.locationId, OR: emailOrPhoneConditions } })
    : null;

  if (existingByEmailOrPhone) {
    return prisma.contact.update({
      where: { id: existingByEmailOrPhone.id },
      data: { firstName: normalizedFirstName, lastName: normalizedLastName, name, email: normalizedEmail, phone: normalizedPhone, notes: normalizedNotes ?? existingByEmailOrPhone.notes, preferredChannel, source: ContactSource.WEBHOOK },
    });
  }

  return prisma.contact.create({
    data: { locationId: payload.locationId, firstName: normalizedFirstName, lastName: normalizedLastName, name, email: normalizedEmail, phone: normalizedPhone, notes: normalizedNotes, preferredChannel, source: ContactSource.WEBHOOK },
  });
}

async function createCampaignFromStep({
  step,
  payload,
  contact,
  location,
  automationRunId,
}: {
  step: { id: string; stepType: AutomationStepType; title: string; configJson: Prisma.JsonValue | null };
  payload: AutomationWebhookPayload;
  contact: { id: string; name: string; email: string | null; phone?: string | null };
  location: { id: string; name: string };
  automationRunId: string;
}) {
  const config = coerceStepConfig(step.configJson);
  const channel = parsePreferredChannel(config.channel ?? payload.contact.preferredChannel ?? null);
  const sentAt = new Date();
  const token = `rr_tok_${crypto.randomBytes(6).toString("hex")}`;
  const recipientExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const workflowName = normalizeText(payload.metadata?.workflowName) ?? normalizeText(step.title) ?? `${payload.eventType.replace(/_/g, " ")} automation`;
  const messageBody = normalizeText(payload.metadata?.messageBody) ?? normalizeText(config.messageBody) ?? null;
  const emailSubject = normalizeText(payload.metadata?.emailSubject) ?? normalizeText(config.emailSubject) ?? null;
  const destination = normalizeText(payload.metadata?.destination) ?? normalizeText(config.destination) ?? "4-5 stars redirect to Google, 1-3 stars collect private feedback";

  const campaign = await prisma.campaign.create({
    data: {
      locationId: location.id,
      automationRunId,
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
          expiresAt: recipientExpiresAt,
        },
      },
    },
    include: { recipients: { include: { contact: true } } },
  });

  if (channel === PreferredChannel.EMAIL) {
    await sendCampaignEmails({
      recipients: campaign.recipients.map((r) => ({ token: r.token, contact: r.contact })),
      emailSubject,
      locationName: location.name,
    });
  }

  if (channel === PreferredChannel.SMS && isSMSSendingConfigured()) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    for (const recipient of campaign.recipients) {
      if (recipient.contact.phone) {
        await sendReviewRequestSMS({
          to: recipient.contact.phone,
          recipientName: recipient.contact.name,
          locationName: location.name,
          reviewUrl: `${appUrl}/r/${recipient.token}`,
          messageBody,
        });
      }
    }
  }

  await prisma.contact.update({ where: { id: contact.id }, data: { lastInvitedAt: sentAt } });

  return {
    campaignId: campaign.id,
    detail: `Created ${channel.toLowerCase()} campaign ${campaign.id} for contact ${contact.id}`,
  };
}

async function executeSteps({
  steps,
  contact,
  location,
  automationRun,
  payload,
}: {
  steps: Array<{ id: string; stepType: AutomationStepType; title: string; configJson: Prisma.JsonValue | null }>;
  contact: { id: string; name: string; email: string | null; phone?: string | null };
  location: { id: string; name: string };
  automationRun: { id: string };
  payload: AutomationWebhookPayload;
}) {
  const stepsExecuted: AutomationExecutionResult["stepsExecuted"] = [];
  let createdCampaignId: string | null = null;
  let scheduledAt: Date | null = null;

  for (const step of steps) {
    const config = coerceStepConfig(step.configJson);
    const stepStartedAt = new Date();

    if (step.stepType === AutomationStepType.DELAY) {
      const delayMs = getDelayMs(config);
      scheduledAt = new Date(getOccurredAt(payload).getTime() + delayMs);
      stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "scheduled", detail: `Delay queued until ${scheduledAt.toISOString()}` });
      // DELAY is pure scheduling state — no step execution record needed
      continue;
    }

    if (step.stepType === AutomationStepType.SEND_REQUEST) {
      if (scheduledAt) {
        const job = await prisma.automationJob.create({
          data: {
            automationRunId: automationRun.id,
            automationStepId: step.id,
            status: "pending",
            executeAt: scheduledAt,
            payloadJson: payload as Prisma.InputJsonValue,
          },
        });
        await prisma.automationRun.update({ where: { id: automationRun.id }, data: { status: "scheduled" } });
        // Persist the scheduled step execution linked to the job
        await prisma.automationStepExecution.create({
          data: {
            automationRunId: automationRun.id,
            automationStepId: step.id,
            automationJobId: job.id,
            status: "scheduled",
            detail: `Send request scheduled for ${scheduledAt.toISOString()}`,
            startedAt: stepStartedAt,
          },
        });
        const detail = `Send request scheduled for ${scheduledAt.toISOString()}`;
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "scheduled", detail });
      } else {
        try {
          const outcome = await createCampaignFromStep({
            step,
            payload,
            contact,
            location,
            automationRunId: automationRun.id,
          });
          createdCampaignId = outcome.campaignId;
          await prisma.automationStepExecution.create({
            data: {
              automationRunId: automationRun.id,
              automationStepId: step.id,
              campaignId: outcome.campaignId,
              status: "executed",
              detail: outcome.detail,
              startedAt: stepStartedAt,
              completedAt: new Date(),
            },
          });
          stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "executed", detail: outcome.detail });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to create campaign";
          await prisma.automationStepExecution.create({
            data: {
              automationRunId: automationRun.id,
              automationStepId: step.id,
              status: "failed",
              detail: msg,
              errorMessage: msg,
              startedAt: stepStartedAt,
              completedAt: new Date(),
            },
          });
          stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "failed", detail: msg });
        }
      }
      continue;
    }

    if (step.stepType === AutomationStepType.TAG_CONTACT) {
      const tagName = config.tagName?.trim();
      if (tagName) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
          select: { id: true },
        });
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
          update: {},
          create: { contactId: contact.id, tagId: tag.id },
        });
        const detail = `Tagged contact as "${tagName}"`;
        await prisma.automationStepExecution.create({
          data: { automationRunId: automationRun.id, automationStepId: step.id, status: "executed", detail, startedAt: stepStartedAt, completedAt: new Date() },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "executed", detail });
      } else {
        const detail = "No tag name configured";
        await prisma.automationStepExecution.create({
          data: { automationRunId: automationRun.id, automationStepId: step.id, status: "skipped", detail, startedAt: stepStartedAt, completedAt: new Date() },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail });
      }
      continue;
    }

    if (step.stepType === AutomationStepType.NOTIFY_TEAM) {
      const notifyEmail = config.notifyEmail?.trim();
      if (notifyEmail && isEmailSendingConfigured()) {
        await sendTeamNotificationEmail({ to: notifyEmail, contactName: contact.name, locationName: location.name, eventType: payload.eventType });
        const detail = `Team notification sent to ${notifyEmail}`;
        await prisma.automationStepExecution.create({
          data: { automationRunId: automationRun.id, automationStepId: step.id, status: "executed", detail, startedAt: stepStartedAt, completedAt: new Date() },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "executed", detail });
      } else {
        const detail = notifyEmail ? "Email sending not configured" : "No notify email configured";
        await prisma.automationStepExecution.create({
          data: { automationRunId: automationRun.id, automationStepId: step.id, status: "skipped", detail, startedAt: stepStartedAt, completedAt: new Date() },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail });
      }
      continue;
    }

    if (step.stepType === AutomationStepType.WEBHOOK) {
      const webhookUrl = config.webhookUrl?.trim();
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: payload.eventType,
              automationRunId: automationRun.id,
              contact: { id: contact.id, name: contact.name, email: contact.email },
              location: { id: location.id, name: location.name },
            }),
          });
          const detail = `Webhook fired to ${webhookUrl}`;
          await prisma.automationStepExecution.create({
            data: { automationRunId: automationRun.id, automationStepId: step.id, status: "executed", detail, startedAt: stepStartedAt, completedAt: new Date() },
          });
          stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "executed", detail });
        } catch {
          const detail = `Webhook to ${webhookUrl} failed`;
          await prisma.automationStepExecution.create({
            data: { automationRunId: automationRun.id, automationStepId: step.id, status: "failed", detail, errorMessage: detail, startedAt: stepStartedAt, completedAt: new Date() },
          });
          stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail });
        }
      } else {
        const detail = "No webhook URL configured";
        await prisma.automationStepExecution.create({
          data: { automationRunId: automationRun.id, automationStepId: step.id, status: "skipped", detail, startedAt: stepStartedAt, completedAt: new Date() },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail });
      }
      continue;
    }

    if (step.stepType === AutomationStepType.PUBLISH_GBP_REPLY) {
      const review = await prisma.review.findFirst({
        where: {
          locationId: location.id,
          contactId: contact.id,
          source: "GOOGLE",
          replyDraft: { not: null },
          replyPublishedAt: null,
          externalId: { not: null },
        },
        include: {
          location: {
            select: {
              googleLocationName: true,
              googleConnection: {
                select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true, tokenType: true },
              },
            },
          },
        },
        orderBy: { reviewedAt: "desc" },
      });

      if (!review || !review.location.googleConnection || !review.location.googleLocationName || !review.externalId) {
        const detail = "No eligible Google review with draft found for contact";
        await prisma.automationStepExecution.create({
          data: { automationRunId: automationRun.id, automationStepId: step.id, status: "skipped", detail, startedAt: stepStartedAt, completedAt: new Date() },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail });
        continue;
      }

      try {
        const accessToken = await getValidGoogleAccessToken(review.location.googleConnection);
        const reviewName = `${review.location.googleLocationName}/reviews/${review.externalId}`;
        await publishGbpReply(accessToken, reviewName, review.replyDraft!);
        await prisma.review.update({ where: { id: review.id }, data: { replyPublishedAt: new Date(), replyGbpId: reviewName } });
        const detail = `Published GBP reply for review ${review.id}`;
        await prisma.automationStepExecution.create({
          data: { automationRunId: automationRun.id, automationStepId: step.id, status: "executed", detail, startedAt: stepStartedAt, completedAt: new Date() },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "executed", detail });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to publish GBP reply";
        await prisma.automationStepExecution.create({
          data: { automationRunId: automationRun.id, automationStepId: step.id, status: "failed", detail: msg, errorMessage: msg, startedAt: stepStartedAt, completedAt: new Date() },
        });
        stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail: msg });
      }
      continue;
    }

    // Unknown step type — persist as skipped
    const detail = "Step type not implemented";
    await prisma.automationStepExecution.create({
      data: { automationRunId: automationRun.id, automationStepId: step.id, status: "skipped", detail, startedAt: stepStartedAt, completedAt: new Date() },
    });
    stepsExecuted.push({ stepId: step.id, stepType: step.stepType, status: "skipped", detail });
  }

  // Mark run completed/scheduled and set completedAt
  const isScheduled = stepsExecuted.some(
    (s) => s.status === "scheduled" && s.stepType === AutomationStepType.SEND_REQUEST
  );
  if (!isScheduled) {
    await prisma.automationRun.update({
      where: { id: automationRun.id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  return { stepsExecuted, createdCampaignId };
}

export async function executePendingAutomationJobs(limit = 25) {
  const dueJobs = await prisma.automationJob.findMany({
    where: { status: "pending", executeAt: { lte: new Date() } },
    include: {
      automationStep: true,
      automationRun: { include: { contact: true, location: true } },
    },
    orderBy: { executeAt: "asc" },
    take: limit,
  });

  const results: Array<{ jobId: string; status: "executed" | "failed" | "retrying"; detail: string; campaignId?: string | null }> = [];

  // dueJobs is a snapshot taken once above; the loop iterates that fixed array.
  // A job reset to "pending" for retry below will NOT be re-picked within this
  // same invocation — it is only eligible on a future runner tick. This avoids
  // infinite retry loops inside a single call.
  for (const job of dueJobs) {
    try {
      await prisma.automationJob.update({ where: { id: job.id }, data: { status: "processing" } });

      if (job.automationStep.stepType !== AutomationStepType.SEND_REQUEST) {
        const detail = `Skipped unsupported queued step type ${job.automationStep.stepType}`;
        await prisma.automationJob.update({ where: { id: job.id }, data: { status: "completed", executedAt: new Date() } });
        await prisma.automationStepExecution.upsert({
          where: { automationJobId: job.id },
          update: { status: "skipped", detail, completedAt: new Date() },
          create: { automationRunId: job.automationRunId, automationStepId: job.automationStepId, automationJobId: job.id, status: "skipped", detail, completedAt: new Date() },
        });
        results.push({ jobId: job.id, status: "executed", detail });
        continue;
      }

      const payload = (job.automationRun.payloadJson ?? {}) as AutomationWebhookPayload;
      const outcome = await createCampaignFromStep({
        step: job.automationStep,
        payload,
        contact: job.automationRun.contact,
        location: job.automationRun.location,
        automationRunId: job.automationRunId,
      });

      const now = new Date();
      await prisma.automationJob.update({ where: { id: job.id }, data: { status: "completed", executedAt: now, errorMessage: null } });
      await prisma.automationRun.update({ where: { id: job.automationRunId }, data: { status: "completed", completedAt: now } });
      // Update (or create) the step execution: link in the campaign and mark executed
      await prisma.automationStepExecution.upsert({
        where: { automationJobId: job.id },
        update: { status: "executed", detail: outcome.detail, campaignId: outcome.campaignId, completedAt: now },
        create: {
          automationRunId: job.automationRunId,
          automationStepId: job.automationStepId,
          automationJobId: job.id,
          campaignId: outcome.campaignId,
          status: "executed",
          detail: outcome.detail,
          completedAt: now,
        },
      });

      results.push({ jobId: job.id, status: "executed", detail: outcome.detail, campaignId: outcome.campaignId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled automation job failed";
      const now = new Date();
      const attemptCount = job.attemptCount + 1;
      const willRetry = attemptCount < job.maxAttempts;

      if (willRetry) {
        // Reset to "pending" so a future runner tick retries it. Preserve the
        // errorMessage for observability and record the bumped attemptCount.
        // The run is left in its current (scheduled) state — not failed — since
        // a later attempt may still succeed.
        await prisma.automationJob.update({
          where: { id: job.id },
          data: { status: "pending", errorMessage: message, attemptCount },
        });
        await prisma.automationStepExecution.upsert({
          where: { automationJobId: job.id },
          update: { status: "retrying", errorMessage: message, completedAt: null },
          create: {
            automationRunId: job.automationRunId,
            automationStepId: job.automationStepId,
            automationJobId: job.id,
            status: "retrying",
            errorMessage: message,
          },
        });
        results.push({ jobId: job.id, status: "retrying", detail: `${message} (attempt ${attemptCount}/${job.maxAttempts}, will retry)` });
      } else {
        // Exhausted all attempts — mark permanently failed and fail the run.
        await prisma.automationJob.update({
          where: { id: job.id },
          data: { status: "failed", errorMessage: message, attemptCount },
        });
        await prisma.automationRun.update({ where: { id: job.automationRunId }, data: { status: "failed", completedAt: now } });
        await prisma.automationStepExecution.upsert({
          where: { automationJobId: job.id },
          update: { status: "failed", errorMessage: message, completedAt: now },
          create: {
            automationRunId: job.automationRunId,
            automationStepId: job.automationStepId,
            automationJobId: job.id,
            status: "failed",
            errorMessage: message,
            completedAt: now,
          },
        });
        results.push({ jobId: job.id, status: "failed", detail: `${message} (attempt ${attemptCount}/${job.maxAttempts}, giving up)` });
      }
    }
  }

  return { processed: results.length, results };
}

export async function executeAutomationWebhook(payload: AutomationWebhookPayload): Promise<AutomationExecutionResult> {
  const triggerType = mapEventTypeToTriggerType(payload.eventType);

  const location = await prisma.location.findUnique({
    where: { id: payload.locationId },
    select: { id: true, name: true, organizationId: true },
  });

  if (!location) throw new Error("Location not found");

  const automation = await prisma.automation.findFirst({
    where: { isActive: true, triggerType, organizationId: location.organizationId },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  if (!automation) throw new Error(`No active automation found for trigger ${triggerType}`);

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

  const { stepsExecuted, createdCampaignId } = await executeSteps({
    steps: automation.steps,
    contact,
    location,
    automationRun,
    payload,
  });

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

export async function executeManualEnrollment({
  automationId,
  contactId,
  organizationId,
}: {
  automationId: string;
  contactId: string;
  organizationId: string;
}): Promise<AutomationExecutionResult> {
  const [automation, contact] = await Promise.all([
    prisma.automation.findFirst({
      where: { id: automationId, organizationId, triggerType: AutomationTriggerType.MANUAL_ENROLLMENT, isActive: true },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    }),
    prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true, name: true, email: true, phone: true, preferredChannel: true, locationId: true },
    }),
  ]);

  if (!automation) throw new Error("Active manual enrollment automation not found.");
  if (!contact) throw new Error("Contact not found.");

  const location = await prisma.location.findUnique({
    where: { id: contact.locationId },
    select: { id: true, name: true },
  });
  if (!location) throw new Error("Location not found.");

  const automationRun = await prisma.automationRun.create({
    data: {
      automationId: automation.id,
      locationId: location.id,
      contactId: contact.id,
      triggerEvent: "manual_enrollment",
      source: "manual",
      status: "running",
      payloadJson: { contactId, triggeredBy: "manual_enrollment" } as Prisma.InputJsonValue,
    },
  });

  const syntheticPayload: AutomationWebhookPayload = {
    eventType: "appointment_completed",
    locationId: location.id,
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      preferredChannel: contact.preferredChannel,
    },
    metadata: { source: "manual_enrollment" },
  };

  const { stepsExecuted, createdCampaignId } = await executeSteps({
    steps: automation.steps,
    contact,
    location,
    automationRun,
    payload: syntheticPayload,
  });

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
