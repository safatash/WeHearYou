import { NextRequest, NextResponse } from "next/server";
import { executePendingAutomationJobs } from "@/lib/automation-engine";

function getExpectedRunnerSecret() {
  return process.env.AUTOMATION_RUNNER_SECRET?.trim() || process.env.AUTOMATION_WEBHOOK_SECRET?.trim() || "";
}

function extractRunnerSecret(request: NextRequest) {
  return request.headers.get("x-automation-runner-secret")?.trim() || request.headers.get("x-automation-secret")?.trim() || "";
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = getExpectedRunnerSecret();

    if (!expectedSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "AUTOMATION_RUNNER_SECRET is not configured",
        },
        { status: 503 },
      );
    }

    const providedSecret = extractRunnerSecret(request);

    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized runner request",
        },
        { status: 401 },
      );
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
