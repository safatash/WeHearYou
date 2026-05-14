import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForTokens, fetchGoogleUserInfo, parseOAuthState, upsertGoogleConnection } from "@/lib/google-oauth";

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

  const parsedState = parseOAuthState(state);

  if (!parsedState) {
    return redirectToIntegrations("/integrations?google=invalid_state");
  }

  try {
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

    return redirectToIntegrations("/integrations?google=connected");
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "unknown_error";
    return redirectToIntegrations(`/integrations?google=callback_failed&reason=${encodeURIComponent(message)}`);
  }
}
