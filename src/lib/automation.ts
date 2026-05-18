import { AutomationStepType, AutomationTriggerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const automationInclude = {
  steps: {
    orderBy: {
      orderIndex: "asc",
    },
  },
} satisfies Prisma.AutomationInclude;

export type AutomationWithSteps = Prisma.AutomationGetPayload<{
  include: typeof automationInclude;
}>;

export async function getAutomations(organizationId: string) {
  return prisma.automation.findMany({
    where: { organizationId },
    include: automationInclude,
    orderBy: [{ createdAt: "asc" }],
  });
}

export function formatTriggerType(trigger: AutomationTriggerType) {
  switch (trigger) {
    case "APPOINTMENT_COMPLETED":
      return "Appointment Completed";
    case "PROJECT_COMPLETED":
      return "Project Completed";
    case "MANUAL_ENROLLMENT":
      return "Manual Enrollment";
    case "WEBHOOK_EVENT":
      return "Webhook Event";
    default:
      return trigger;
  }
}

export function formatStepType(stepType: AutomationStepType) {
  switch (stepType) {
    case "DELAY":
      return "Delay";
    case "SEND_REQUEST":
      return "Action";
    case "TAG_CONTACT":
      return "Tag Contact";
    case "NOTIFY_TEAM":
      return "Notify Team";
    case "WEBHOOK":
      return "Webhook";
    default:
      return stepType;
  }
}

export function formatConfig(config: Prisma.JsonValue | null) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return "No config";
  }

  return Object.entries(config)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" • ");
}
