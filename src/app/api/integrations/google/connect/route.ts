import { NextResponse } from "next/server";
import { buildGoogleOAuthUrl, getGoogleOAuthConfig, getPrimaryOrganization } from "@/lib/google-oauth";

export async function GET() {
  const organization = await getPrimaryOrganization();

  if (!organization) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/integrations?google=sync-error&message=Google+OAuth+is+not+configured.+Add+GOOGLE_CLIENT_ID%2C+GOOGLE_CLIENT_SECRET%2C+and+GOOGLE_OAUTH_REDIRECT_URI", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const url = buildGoogleOAuthUrl({ organizationId: organization.id });
  return NextResponse.redirect(url);
}
