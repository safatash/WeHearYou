import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForTokens, fetchGoogleUserInfo, parseOAuthState, upsertGoogleConnection } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    const description = url.searchParams.get("error_description");
    const reason = description || error;
    return NextResponse.redirect(new URL(`/integrations?google=error&reason=${encodeURIComponent(reason)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/integrations?google=missing_params", request.url));
  }

  const parsedState = parseOAuthState(state);

  if (!parsedState) {
    return NextResponse.redirect(new URL("/integrations?google=invalid_state", request.url));
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

    return NextResponse.redirect(new URL("/integrations?google=connected", request.url));
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "unknown_error";
    return NextResponse.redirect(new URL(`/integrations?google=callback_failed&reason=${encodeURIComponent(message)}`, request.url));
  }
}
