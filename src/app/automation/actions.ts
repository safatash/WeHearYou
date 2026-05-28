"use server";

type AutomationStepType = "DELAY" | "SEND_REQUEST" | "TAG_CONTACT" | "NOTIFY_TEAM" | "WEBHOOK";
type AutomationTriggerType = "APPOINTMENT_COMPLETED" | "PROJECT_COMPLETED" | "MANUAL_ENROLLMENT" | "WEBHOOK_EVENT";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAutomationManagement } from "@/lib/authz";
import { executeManualEnrollment } from "@/lib/automation-engine";

function normalize(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export async function createAutomation(formData: FormData) {
  const membership = await requireAutomationManagement();
  const name = normalize(formData.get("name"));
  const triggerType = normalize(formData.get("triggerType")) as AutomationTriggerType | null;

  if (!name) throw new Error("Name is required.");
  if (!triggerType) throw new Error("Trigger type is required.");

  const automation = await prisma.automation.create({
    data: {
      organizationId: membership.organizationId,
      name,
      triggerType,
      isActive: false,
    },
  });

  redirect(`/automation/${automation.id}`);
}

export async function updateAutomation(formData: FormData) {
  const membership = await requireAutomationManagement();
  const automationId = normalize(formData.get("automationId"));
  const name = normalize(formData.get("name"));
  const triggerType = normalize(formData.get("triggerType")) as AutomationTriggerType | null;
  const isActive = formData.get("isActive") === "true";

  if (!automationId) throw new Error("Automation ID is required.");
  if (!name) throw new Error("Name is required.");
  if (!triggerType) throw new Error("Trigger type is required.");

  const existing = await prisma.automation.findFirst({
    where: { id: automationId, organizationId: membership.organizationId },
  });
  if (!existing) throw new Error("Automation not found.");

  await prisma.automation.update({
    where: { id: automationId },
    data: { name, triggerType, isActive },
  });

  redirect(`/automation/${automationId}?flash=saved`);
}

export async function deleteAutomation(formData: FormData) {
  const membership = await requireAutomationManagement();
  const automationId = normalize(formData.get("automationId"));

  if (!automationId) throw new Error("Automation ID is required.");

  const existing = await prisma.automation.findFirst({
    where: { id: automationId, organizationId: membership.organizationId },
  });
  if (!existing) throw new Error("Automation not found.");

  await prisma.automation.delete({ where: { id: automationId } });

  redirect("/automation");
}

export async function addStep(formData: FormData) {
  const membership = await requireAutomationManagement();
  const automationId = normalize(formData.get("automationId"));
  const stepType = normalize(formData.get("stepType")) as AutomationStepType | null;
  const title = normalize(formData.get("title"));
  const description = normalize(formData.get("description"));

  if (!automationId) throw new Error("Automation ID is required.");
  if (!stepType) throw new Error("Step type is required.");
  if (!title) throw new Error("Title is required.");

  const automation = await prisma.automation.findFirst({
    where: { id: automationId, organizationId: membership.organizationId },
    include: { steps: { select: { orderIndex: true }, orderBy: { orderIndex: "desc" } } },
  });
  if (!automation) throw new Error("Automation not found.");

  const nextIndex = (automation.steps[0]?.orderIndex ?? -1) + 1;

  // Build configJson from step type
  let configJson: Record<string, string> = {};

  if (stepType === "DELAY") {
    const delayHours = normalize(formData.get("delayHours"));
    if (delayHours) configJson.delayHours = delayHours;
  }

  if (stepType === "SEND_REQUEST") {
    const emailSubject = normalize(formData.get("emailSubject"));
    const messageBody = normalize(formData.get("messageBody"));
    const channel = normalize(formData.get("channel"));
    if (emailSubject) configJson.emailSubject = emailSubject;
    if (messageBody) configJson.messageBody = messageBody;
    if (channel) configJson.channel = channel;
  }

  if (stepType === "TAG_CONTACT") {
    const tagName = normalize(formData.get("tagName"));
    if (tagName) configJson.tagName = tagName;
  }

  if (stepType === "NOTIFY_TEAM") {
    const notifyEmail = normalize(formData.get("notifyEmail"));
    if (notifyEmail) configJson.notifyEmail = notifyEmail;
  }

  if (stepType === "WEBHOOK") {
    const webhookUrl = normalize(formData.get("webhookUrl"));
    if (webhookUrl) configJson.webhookUrl = webhookUrl;
  }

  await prisma.automationStep.create({
    data: {
      automationId,
      stepType,
      title,
      description,
      orderIndex: nextIndex,
      configJson: Object.keys(configJson).length > 0 ? configJson : undefined,
    },
  });

  redirect(`/automation/${automationId}?flash=step-added`);
}

export async function enrollContact(formData: FormData) {
  const membership = await requireAutomationManagement();
  const automationId = normalize(formData.get("automationId"));
  const contactId = normalize(formData.get("contactId"));

  if (!automationId) throw new Error("Automation ID is required.");
  if (!contactId) throw new Error("Contact is required.");

  await executeManualEnrollment({ automationId, contactId, organizationId: membership.organizationId });

  redirect(`/automation/${automationId}?flash=enrolled`);
}

export async function deleteStep(formData: FormData) {
  const membership = await requireAutomationManagement();
  const stepId = normalize(formData.get("stepId"));
  const automationId = normalize(formData.get("automationId"));

  if (!stepId || !automationId) throw new Error("Step ID and Automation ID are required.");

  const step = await prisma.automationStep.findFirst({
    where: { id: stepId, automation: { organizationId: membership.organizationId } },
  });
  if (!step) throw new Error("Step not found.");

  await prisma.automationStep.delete({ where: { id: stepId } });

  // Re-index remaining steps
  const remaining = await prisma.automationStep.findMany({
    where: { automationId },
    orderBy: { orderIndex: "asc" },
  });

  await Promise.all(
    remaining.map((s: { id: string }, i: number) =>
      prisma.automationStep.update({ where: { id: s.id }, data: { orderIndex: i } })
    )
  );

  redirect(`/automation/${automationId}?flash=step-deleted`);
}
