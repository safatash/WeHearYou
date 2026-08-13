import { NextRequest, NextResponse } from "next/server";
import { buildMetaOAuthUrl, isMetaOAuthConfigured } from "@/lib/meta-oauth";
import { randomUUID } from "node:crypto";
import { getCurrentMembership, requireTeamManagement } from "@/lib/authz";
import { featureEnabledForOrg } from "@/lib/plan-features";

function integrationsRedirect(request: NextRequest, facebook: string, message?: string) {
  const url = new URL("/integrations", request.url);
  url.searchParams.set("facebook", facebook);
  if (message) url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Facebook integration is a paid feature — gate connecting behind the plan
  // (dormant while BILLING_ENFORCEMENT is off).
  if (!featureEnabledForOrg(membership.organization.planId, "facebookIntegration")) {
    return NextResponse.redirect(new URL("/billing", request.url));
  }

  if (!isMetaOAuthConfigured()) {
    return integrationsRedirect(
      request,
      "configuration-error",
      "Facebook connection is not configured yet. An account administrator must finish the Facebook app setup before you can connect a Page.",
    );
  }

  try {
    // Starting an OAuth connection changes organization-level integration state,
    // so it must use the same permission boundary as its callback and mapping.
    await requireTeamManagement();
  } catch {
    return integrationsRedirect(
      request,
      "permission-denied",
      "You do not have permission to manage integrations for this organization.",
    );
  }

  const state = randomUUID();
  const url = buildMetaOAuthUrl(state);
  const response = NextResponse.redirect(url);
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
