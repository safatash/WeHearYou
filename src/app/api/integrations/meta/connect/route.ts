import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeMetaCodeForToken, fetchMetaPageInfo } from "@/lib/meta-oauth";
import { encryptToken } from "@/lib/token-encryption";
import { prisma } from "@/lib/prisma";
import { requireTeamManagement } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/integrations?facebook=auth-error&message=Missing+code+or+state", request.url),
    );
  }

  // Verify state token from cookies
  const cookieStore = await cookies();
  const storedState = cookieStore.get("meta_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/integrations?facebook=auth-error&message=Invalid+state+token", request.url),
    );
  }

  try {
    const membership = await requireTeamManagement();

    // Exchange code for token
    const tokenResponse = await exchangeMetaCodeForToken(code, state);

    // Fetch page info
    const pageInfo = await fetchMetaPageInfo(tokenResponse.access_token);

    // Encrypt token before storing
    const encryptedToken = encryptToken(tokenResponse.access_token);

    // Check if connection already exists and update or create
    const existingConnection = await prisma.metaAccountConnection.findFirst({
      where: {
        organizationId: membership.organizationId,
        pageId: pageInfo.id,
      },
    });

    if (existingConnection) {
      await prisma.metaAccountConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: encryptedToken,
          expiresAt: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
          pageName: pageInfo.name,
        },
      });
    } else {
      await prisma.metaAccountConnection.create({
        data: {
          organizationId: membership.organizationId,
          pageId: pageInfo.id,
          pageName: pageInfo.name,
          accessToken: encryptedToken,
          tokenType: tokenResponse.token_type,
          expiresAt: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
          connectedAt: new Date(),
        },
      });
    }

    const redirectUrl = new URL("/integrations", request.url);
    redirectUrl.searchParams.set("facebook", "connected");
    redirectUrl.searchParams.set("page", pageInfo.name);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("meta_oauth_state");

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";

    const redirectUrl = new URL("/integrations", request.url);
    redirectUrl.searchParams.set("facebook", "auth-error");
    redirectUrl.searchParams.set("message", message);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("meta_oauth_state");

    return response;
  }
}
