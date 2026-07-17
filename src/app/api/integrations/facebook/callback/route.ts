import { NextRequest, NextResponse } from "next/server";
import {
  verifyFacebookOAuthState,
  exchangeFacebookCodeForToken,
  exchangeForLongLivedToken,
  fetchFacebookUserInfo,
  fetchFacebookPages,
  upsertFacebookConnection,
} from "@/lib/facebook-oauth";
import { encryptToken } from "@/lib/token-encryption";
import { requireOrganizationAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function redirectToIntegrations(pathAndQuery: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(new URL(pathAndQuery, appUrl));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    const description = url.searchParams.get("error_description");
    const reason = description || error;
    return redirectToIntegrations(`/integrations?facebook=error&reason=${encodeURIComponent(reason)}`);
  }

  if (!code || !state) {
    return redirectToIntegrations("/integrations?facebook=missing_params");
  }

  const parsedState = verifyFacebookOAuthState(state);

  if (!parsedState) {
    return redirectToIntegrations("/integrations?facebook=invalid_state");
  }

  try {
    // Verify the current authenticated session owns the organization in the state.
    await requireOrganizationAccess(parsedState.organizationId);

    // Exchange code for short-lived token, then upgrade to long-lived (~60 days).
    const shortLived = await exchangeFacebookCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const userInfo = await fetchFacebookUserInfo(longLived.access_token);

    const connection = await upsertFacebookConnection({
      organizationId: parsedState.organizationId,
      userId: userInfo.id,
      userName: userInfo.name,
      userEmail: userInfo.email,
      accessToken: longLived.access_token,
      expiresIn: longLived.expires_in,
    });

    // Upsert FacebookPage rows for every page the user manages.
    // This lets the user immediately see their pages in the UI without a separate fetch step.
    const pages = await fetchFacebookPages(longLived.access_token);

    for (const page of pages) {
      await prisma.facebookPage.upsert({
        where: {
          connectionId_pageId: {
            connectionId: connection.id,
            pageId: page.id,
          },
        },
        update: {
          pageName: page.name,
          pageAccessToken: encryptToken(page.access_token) ?? page.access_token,
        },
        create: {
          connectionId: connection.id,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: encryptToken(page.access_token) ?? page.access_token,
        },
      });
    }

    return redirectToIntegrations("/integrations?facebook=connected");
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "unknown_error";
    console.error("[facebook/callback] OAuth callback error:", message);
    return redirectToIntegrations("/integrations?facebook=callback_failed");
  }
}
