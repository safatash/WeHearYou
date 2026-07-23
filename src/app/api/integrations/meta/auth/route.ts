import { NextRequest, NextResponse } from "next/server";
import { buildMetaOAuthUrl } from "@/lib/meta-oauth";
import { randomUUID } from "node:crypto";
import { getCurrentMembership } from "@/lib/authz";
import { featureEnabledForOrg } from "@/lib/plan-features";

export async function GET(_request: NextRequest) {
  // Facebook integration is a paid feature — gate connecting behind the plan
  // (dormant while BILLING_ENFORCEMENT is off).
  const membership = await getCurrentMembership();
  if (membership && !featureEnabledForOrg(membership.organization.planId, "facebookIntegration")) {
    return NextResponse.redirect(new URL("/billing", _request.url));
  }

  const state = randomUUID();
  const url = buildMetaOAuthUrl(state);
  const response = NextResponse.redirect(url);
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
