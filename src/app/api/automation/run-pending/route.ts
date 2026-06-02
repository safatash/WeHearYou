import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { executePendingAutomationJobs } from "@/lib/automation-engine";

function getExpectedRunnerSecret() {
  return process.env.AUTOMATION_RUNNER_SECRET?.trim() || process.env.AUTOMATION_WEBHOOK_SECRET?.trim() || "";
}

function extractRunnerSecret(request: NextRequest) {
  return request.headers.get("x-automation-runner-secret")?.trim() || request.headers.get("x-automation-secret")?.trim() || "";
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = getExpectedRunnerSecret();

    if (!expectedSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 503 });
    }

    const providedSecret = extractRunnerSecret(request);

    if (!providedSecret || !timingSafeStringEqual(providedSecret, expectedSecret)) {
      console.warn("[automation/run-pending] Rejected unauthorized request");
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await executePendingAutomationJobs();

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pending automation run failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
