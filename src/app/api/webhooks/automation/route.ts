import { NextRequest, NextResponse } from "next/server";
import { executeAutomationWebhook, type AutomationWebhookPayload } from "@/lib/automation-engine";

function getExpectedWebhookSecret() {
  return process.env.AUTOMATION_WEBHOOK_SECRET?.trim() || "";
}

function extractWebhookSecret(request: NextRequest) {
  return request.headers.get("x-automation-secret")?.trim() || "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(body: unknown): AutomationWebhookPayload {
  if (!isRecord(body)) {
    throw new Error("Invalid JSON body");
  }

  const eventType = typeof body.eventType === "string" ? body.eventType : null;
  const locationId = typeof body.locationId === "string" ? body.locationId.trim() : "";
  const contact = isRecord(body.contact) ? body.contact : null;
  const metadata = isRecord(body.metadata) ? body.metadata : null;

  if (eventType !== "appointment_completed" && eventType !== "project_completed") {
    throw new Error("eventType must be appointment_completed or project_completed");
  }

  if (!locationId) {
    throw new Error("locationId is required");
  }

  if (!contact) {
    throw new Error("contact is required");
  }

  const hasContactIdentity =
    typeof contact.id === "string" ||
    typeof contact.email === "string" ||
    typeof contact.phone === "string" ||
    typeof contact.name === "string" ||
    typeof contact.firstName === "string" ||
    typeof contact.lastName === "string";

  if (!hasContactIdentity) {
    throw new Error("contact must include at least one identifier field");
  }

  return {
    eventType,
    locationId,
    contact: {
      id: typeof contact.id === "string" ? contact.id : null,
      firstName: typeof contact.firstName === "string" ? contact.firstName : null,
      lastName: typeof contact.lastName === "string" ? contact.lastName : null,
      name: typeof contact.name === "string" ? contact.name : null,
      email: typeof contact.email === "string" ? contact.email : null,
      phone: typeof contact.phone === "string" ? contact.phone : null,
      preferredChannel: contact.preferredChannel === "EMAIL" || contact.preferredChannel === "SMS" ? contact.preferredChannel : null,
      notes: typeof contact.notes === "string" ? contact.notes : null,
    },
    metadata: metadata
      ? {
          occurredAt: typeof metadata.occurredAt === "string" ? metadata.occurredAt : null,
          source: typeof metadata.source === "string" ? metadata.source : null,
          workflowName: typeof metadata.workflowName === "string" ? metadata.workflowName : null,
          destination: typeof metadata.destination === "string" ? metadata.destination : null,
          messageBody: typeof metadata.messageBody === "string" ? metadata.messageBody : null,
          emailSubject: typeof metadata.emailSubject === "string" ? metadata.emailSubject : null,
        }
      : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = getExpectedWebhookSecret();

    if (!expectedSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "AUTOMATION_WEBHOOK_SECRET is not configured",
        },
        { status: 503 },
      );
    }

    const providedSecret = extractWebhookSecret(request);

    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized webhook request",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const payload = parsePayload(body);
    const result = await executeAutomationWebhook(payload);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation webhook failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
