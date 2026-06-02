import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { executeAutomationWebhook, type AutomationWebhookPayload } from "@/lib/automation-engine";

const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes

function getWebhookSecret(): string {
  return process.env.AUTOMATION_WEBHOOK_SECRET?.trim() ?? "";
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Still run comparison to avoid length-based timing leaks
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

type AuthResult = { ok: true } | { ok: false; status: 401 | 503; reason: string };

function verifyRequest(request: NextRequest, rawBody: string, secret: string): AuthResult {
  if (!secret) {
    return { ok: false, status: 503, reason: "Webhook secret is not configured" };
  }

  const signature = request.headers.get("x-automation-signature");
  const timestampHeader = request.headers.get("x-automation-timestamp");

  if (signature && timestampHeader) {
    // HMAC path: x-automation-signature = sha256=<hex>, x-automation-timestamp = unix seconds
    const timestamp = parseInt(timestampHeader, 10);
    if (!Number.isFinite(timestamp)) {
      return { ok: false, status: 401, reason: "Invalid timestamp" };
    }

    const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
    if (ageSeconds > TIMESTAMP_TOLERANCE_SECONDS) {
      return { ok: false, status: 401, reason: "Request timestamp is too old" };
    }

    const expected = `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
    if (!timingSafeEqual(signature, expected)) {
      return { ok: false, status: 401, reason: "Invalid signature" };
    }

    return { ok: true };
  }

  // Legacy path: x-automation-secret header (static shared secret).
  // Deprecated — switch to HMAC signing. This path will be removed in a future release.
  const legacySecret = request.headers.get("x-automation-secret")?.trim() ?? "";
  if (!legacySecret) {
    return { ok: false, status: 401, reason: "Unauthorized" };
  }

  if (!timingSafeEqual(legacySecret, secret)) {
    return { ok: false, status: 401, reason: "Unauthorized" };
  }

  console.warn("[automation/webhook] Legacy x-automation-secret header in use. Migrate to HMAC signing (x-automation-signature + x-automation-timestamp).");
  return { ok: true };
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
  const secret = getWebhookSecret();

  // Read raw body once — needed for HMAC verification before JSON parsing.
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to read request body" }, { status: 400 });
  }

  const auth = verifyRequest(request, rawBody, secret);
  if (!auth.ok) {
    console.warn(`[automation/webhook] Rejected request: ${auth.reason}`);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: auth.status });
  }

  try {
    const body: unknown = JSON.parse(rawBody);
    const payload = parsePayload(body);
    const result = await executeAutomationWebhook(payload);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation webhook failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
