import { NextResponse } from "next/server";
import { buildFacebookOAuthUrl, getFacebookOAuthConfig } from "@/lib/facebook-oauth";
import { getCurrentMembership } from "@/lib/authz";

export async function GET() {
  const membership = await getCurrentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId, appSecret } = getFacebookOAuthConfig();

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      new URL(
        "/integrations?facebook=error&reason=Facebook+OAuth+is+not+configured.+Add+FACEBOOK_APP_ID+and+FACEBOOK_APP_SECRET",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
    );
  }

  const url = buildFacebookOAuthUrl({ organizationId: membership.organizationId });
  return NextResponse.redirect(url);
}
