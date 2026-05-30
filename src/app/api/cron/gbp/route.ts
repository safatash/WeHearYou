import { NextRequest, NextResponse } from "next/server";
import { runGbpScheduler } from "@/lib/gbp-scheduler";
import { runGbpSync } from "@/lib/gbp-sync";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doSync = request.nextUrl.searchParams.get("sync") === "true";

  try {
    const schedulerResult = await runGbpScheduler();
    const syncResult = doSync ? await runGbpSync() : null;
    return NextResponse.json({ ok: true, schedulerResult, syncResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GBP cron failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
