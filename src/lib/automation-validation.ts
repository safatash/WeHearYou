import { AutomationStepType, AutomationTriggerType } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  hint: string;
};

export type ValidationResult = {
  canActivate: boolean; // false when any error-severity issue exists
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
};

export type AutomationForValidation = {
  triggerType: AutomationTriggerType;
  steps: Array<{
    id: string;
    stepType: AutomationStepType;
    title: string;
    configJson: unknown;
  }>;
};

export type ProviderReadiness = {
  hasResendApiKey: boolean;
  hasResendFromEmail: boolean;
  hasTwilioConfig: boolean;
  hasTwilioPhone: boolean;
  hasWebhookSecret: boolean;
  hasRunnerSecret: boolean;
  runnerSecretUsesFallback: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function coerceConfig(configJson: unknown): Record<string, string> {
  if (!configJson || typeof configJson !== "object" || Array.isArray(configJson)) return {};
  return Object.fromEntries(
    Object.entries(configJson as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === "string" ? v : String(v ?? ""),
    ])
  );
}

// ── Main validation ───────────────────────────────────────────────────────────

export function validateAutomation(
  automation: AutomationForValidation,
  provider: ProviderReadiness
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // ── 1. Must have at least one step ──────────────────────────────────────────
  if (automation.steps.length === 0) {
    issues.push({
      severity: "error",
      code: "NO_STEPS",
      message: "No steps configured",
      hint: "Add at least one actionable step (Send Request, Tag Contact, etc.) before activating.",
    });
  }

  // ── 2. Must have at least one non-DELAY step ────────────────────────────────
  const executableSteps = automation.steps.filter((s) => s.stepType !== AutomationStepType.DELAY);
  if (automation.steps.length > 0 && executableSteps.length === 0) {
    issues.push({
      severity: "error",
      code: "ONLY_DELAY_STEPS",
      message: "Workflow only contains delay steps",
      hint: "Add an actionable step (Send Request, Tag Contact, etc.) after the delay.",
    });
  }

  // ── 3. Webhook trigger requires signing secret ──────────────────────────────
  if (
    automation.triggerType === AutomationTriggerType.WEBHOOK_EVENT &&
    !provider.hasWebhookSecret
  ) {
    issues.push({
      severity: "error",
      code: "MISSING_WEBHOOK_SECRET",
      message: "AUTOMATION_WEBHOOK_SECRET is not set",
      hint: "Inbound webhook requests cannot be verified without this secret. See the Setup tab.",
    });
  }

  // ── 4. Delayed steps require the cron runner secret ────────────────────────
  const hasDelayStep = automation.steps.some((s) => s.stepType === AutomationStepType.DELAY);
  if (hasDelayStep && !provider.hasRunnerSecret) {
    issues.push({
      severity: "error",
      code: "MISSING_RUNNER_SECRET",
      message: "AUTOMATION_RUNNER_SECRET is not set",
      hint: "Delayed jobs cannot be executed by the cron runner without this secret. See the Setup tab.",
    });
  }

  // ── 5. Per-step validation ──────────────────────────────────────────────────
  for (const step of automation.steps) {
    const config = coerceConfig(step.configJson);
    const label = step.title?.trim() || `Step (${step.stepType})`;

    // DELAY ─────────────────────────────────────────────────────────────────
    if (step.stepType === AutomationStepType.DELAY) {
      const delayHours   = Number(config.delayHours   ?? "");
      const delayMinutes = Number(config.delayMinutes ?? "");
      const delayRaw     = Number(config.delay        ?? "");

      const validHours   = Number.isFinite(delayHours)   && delayHours   > 0;
      const validMinutes = Number.isFinite(delayMinutes)  && delayMinutes > 0;
      const validRaw     = Number.isFinite(delayRaw)      && delayRaw     > 0;

      if (!validHours && !validMinutes && !validRaw) {
        issues.push({
          severity: "error",
          code: "INVALID_DELAY",
          message: `"${label}" has no valid delay configured`,
          hint: "Set delayHours or delayMinutes to a positive number in the step configuration.",
        });
      } else {
        const totalHours = validHours ? delayHours : validMinutes ? delayMinutes / 60 : delayRaw / 60;
        if (totalHours > 720) {
          issues.push({
            severity: "warning",
            code: "EXCESSIVE_DELAY",
            message: `"${label}" delays more than 30 days`,
            hint: "Contact data may become stale before this step executes. Verify this is intentional.",
          });
        }
      }
    }

    // SEND_REQUEST ──────────────────────────────────────────────────────────
    if (step.stepType === AutomationStepType.SEND_REQUEST) {
      const channel     = (config.channel ?? "").toUpperCase();
      const isEmailOnly = channel === "EMAIL";
      const isSmsOnly   = channel === "SMS";
      const isBoth      = !channel; // no channel = uses contact preference; may attempt both

      if ((isEmailOnly || isBoth) && !provider.hasResendApiKey) {
        issues.push({
          severity: "error",
          code: "MISSING_RESEND",
          message: `"${label}" may send email but RESEND_API_KEY is not set`,
          hint: "Add RESEND_API_KEY (and optionally RESEND_FROM_EMAIL) to your environment variables.",
        });
      }

      if ((isSmsOnly || isBoth) && !provider.hasTwilioConfig) {
        issues.push({
          severity: "error",
          code: "MISSING_TWILIO",
          message: `"${label}" may send SMS but Twilio is not configured`,
          hint: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
        });
      }

      if (isSmsOnly || isBoth) {
        issues.push({
          severity: "warning",
          code: "SMS_COMPLIANCE",
          message: `"${label}" sends SMS — verify compliance before going live`,
          hint: "Contacts must have opted in. Include opt-out instructions (e.g. 'Reply STOP'). Respect quiet hours (typically 8pm–9am local time).",
        });
      }
    }

    // NOTIFY_TEAM ───────────────────────────────────────────────────────────
    if (step.stepType === AutomationStepType.NOTIFY_TEAM) {
      const notifyEmail = config.notifyEmail?.trim();
      if (!notifyEmail) {
        issues.push({
          severity: "warning",
          code: "NOTIFY_NO_EMAIL",
          message: `"${label}" has no notification email — step will be skipped`,
          hint: "Set a notification email address in the step configuration.",
        });
      } else if (!provider.hasResendApiKey) {
        issues.push({
          severity: "error",
          code: "NOTIFY_MISSING_RESEND",
          message: `"${label}" sends team notification email but RESEND_API_KEY is not set`,
          hint: "Team notification emails cannot be sent without Resend configured.",
        });
      }
    }

    // WEBHOOK ───────────────────────────────────────────────────────────────
    if (step.stepType === AutomationStepType.WEBHOOK) {
      const webhookUrl = config.webhookUrl?.trim();
      if (!webhookUrl) {
        issues.push({
          severity: "error",
          code: "WEBHOOK_NO_URL",
          message: `"${label}" has no webhook URL configured`,
          hint: "Set a target URL in the step configuration.",
        });
      } else if (!/^https?:\/\/.+/.test(webhookUrl)) {
        issues.push({
          severity: "warning",
          code: "WEBHOOK_INVALID_URL",
          message: `"${label}" webhook URL does not look like a valid URL`,
          hint: "The URL should start with https:// (or http:// for internal services).",
        });
      } else if (!webhookUrl.startsWith("https://")) {
        issues.push({
          severity: "warning",
          code: "WEBHOOK_NOT_HTTPS",
          message: `"${label}" webhook URL is not HTTPS`,
          hint: "Non-HTTPS URLs will transmit payload data unencrypted. Use HTTPS in production.",
        });
      }
    }

    // TAG_CONTACT ───────────────────────────────────────────────────────────
    if (step.stepType === AutomationStepType.TAG_CONTACT) {
      const tagName = config.tagName?.trim();
      if (!tagName) {
        issues.push({
          severity: "warning",
          code: "TAG_NO_NAME",
          message: `"${label}" has no tag name — step will be skipped at runtime`,
          hint: "Set a tag name in the step configuration.",
        });
      }
    }
  }

  const errorCount   = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return { canActivate: errorCount === 0, issues, errorCount, warningCount };
}

// ── Read provider config from env (server-only) ───────────────────────────────

export function getProviderReadiness(): ProviderReadiness {
  const hasRunnerSecretDirect = !!process.env.AUTOMATION_RUNNER_SECRET;
  const hasWebhookSecretFallback = !!process.env.AUTOMATION_WEBHOOK_SECRET;

  return {
    hasResendApiKey:          !!process.env.RESEND_API_KEY,
    hasResendFromEmail:       !!process.env.RESEND_FROM_EMAIL,
    hasTwilioConfig:          !!(
                                process.env.TWILIO_ACCOUNT_SID &&
                                process.env.TWILIO_AUTH_TOKEN &&
                                process.env.TWILIO_PHONE_NUMBER
                              ),
    hasTwilioPhone:           !!process.env.TWILIO_PHONE_NUMBER,
    hasWebhookSecret:         hasWebhookSecretFallback,
    hasRunnerSecret:          hasRunnerSecretDirect || hasWebhookSecretFallback,
    runnerSecretUsesFallback: !hasRunnerSecretDirect && hasWebhookSecretFallback,
  };
}
