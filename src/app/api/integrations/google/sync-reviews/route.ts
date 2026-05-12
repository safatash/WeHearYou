import { NextRequest, NextResponse } from "next/server";
import { syncMappedGoogleReviewLocations } from "@/lib/google-review-sync-service";

function getExpectedSyncSecret() {
  return (
    process.env.GOOGLE_REVIEW_SYNC_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.AUTOMATION_RUNNER_SECRET?.trim() ||
    ""
  );
}

function extractBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice("bearer ".length).trim();
}

function extractSyncSecret(request: NextRequest) {
  return (
    request.headers.get("x-google-review-sync-secret")?.trim() ||
    request.headers.get("x-automation-runner-secret")?.trim() ||
    extractBearerToken(request)
  );
}

function parseConnectionId(value: string | null) {
  const normalized = value?.trim() || "";
  return normalized.length > 0 ? normalized : undefined;
}

async function runGoogleReviewSync(request: NextRequest) {
  const expectedSecret = getExpectedSyncSecret();

  if (!expectedSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "GOOGLE_REVIEW_SYNC_SECRET or CRON_SECRET is not configured",
      },
      { status: 503 },
    );
  }

  const providedSecret = extractSyncSecret(request);

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized Google review sync request",
      },
      { status: 401 },
    );
  }

  let googleConnectionId = parseConnectionId(request.nextUrl.searchParams.get("googleConnectionId"));

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object" && "googleConnectionId" in body) {
        googleConnectionId = parseConnectionId(String(body.googleConnectionId ?? ""));
      }
    }
  }

  const result = await syncMappedGoogleReviewLocations({ googleConnectionId });

  return NextResponse.json({
    ok: true,
    scope: googleConnectionId ? "connection" : "all_mapped_locations",
    googleConnectionId: googleConnectionId ?? null,
    result,
  });
}

export async function GET(request: NextRequest) {
  try {
    return await runGoogleReviewSync(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google review sync failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await runGoogleReviewSync(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google review sync failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
