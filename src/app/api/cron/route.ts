import { NextRequest, NextResponse } from "next/server";
import { executePendingAutomationJobs } from "@/lib/automation-engine";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executePendingAutomationJobs();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
