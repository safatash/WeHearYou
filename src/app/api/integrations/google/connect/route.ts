import { NextResponse } from "next/server";
import { buildGoogleOAuthUrl, getGoogleOAuthConfig } from "@/lib/google-oauth";
import { getCurrentMembership } from "@/lib/authz";

export async function GET() {
  const membership = await getCurrentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/integrations?google=sync-error&message=Google+OAuth+is+not+configured.+Add+GOOGLE_CLIENT_ID%2C+GOOGLE_CLIENT_SECRET%2C+and+GOOGLE_OAUTH_REDIRECT_URI", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const url = buildGoogleOAuthUrl({ organizationId: membership.organizationId });
  return NextResponse.redirect(url);
}
