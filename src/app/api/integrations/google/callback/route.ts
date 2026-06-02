import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForTokens, fetchGoogleUserInfo, verifyOAuthState, upsertGoogleConnection } from "@/lib/google-oauth";
import { requireOrganizationAccess } from "@/lib/authz";

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
    return redirectToIntegrations(`/integrations?google=error&reason=${encodeURIComponent(reason)}`);
  }

  if (!code || !state) {
    return redirectToIntegrations("/integrations?google=missing_params");
  }

  const parsedState = verifyOAuthState(state);

  if (!parsedState) {
    return redirectToIntegrations("/integrations?google=invalid_state");
  }

  try {
    // Verify the current authenticated session owns the organization in the state.
    // This prevents a stolen/replayed state from being used by a different user.
    await requireOrganizationAccess(parsedState.organizationId);

    const tokens = await exchangeGoogleCodeForTokens(code);
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);

    await upsertGoogleConnection({
      organizationId: parsedState.organizationId,
      providerAccountId: userInfo.sub,
      email: userInfo.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      expiresIn: tokens.expires_in,
    });

    const returnTo = parsedState.returnTo;
    const isSafeReturnTo = typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//");
    const successPath = isSafeReturnTo
      ? `${returnTo}?connected=1`
      : "/integrations?google=connected";
    return redirectToIntegrations(successPath);
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "unknown_error";
    // Don't expose internal error details in the redirect URL
    console.error("[google/callback] OAuth callback error:", message);
    return redirectToIntegrations("/integrations?google=callback_failed");
  }
}
