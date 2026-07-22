import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeMetaCodeForToken,
  exchangeForLongLivedUserToken,
  fetchMetaUserPages,
} from "@/lib/meta-oauth";
import { categorizeMetaPageSelection } from "@/lib/meta-pages";
import { storeMetaPageConnection } from "@/lib/meta-connection";
import { encryptToken } from "@/lib/token-encryption";
import { requireTeamManagement } from "@/lib/authz";

/** Short-lived cookie carrying the (encrypted) user token to the page picker. */
const USER_TOKEN_COOKIE = "meta_user_token";

function errorRedirect(request: NextRequest, message: string) {
  const url = new URL("/integrations", request.url);
  url.searchParams.set("facebook", "auth-error");
  url.searchParams.set("message", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete("meta_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return errorRedirect(request, "Missing code or state");
  }

  // Verify state token from cookies
  const cookieStore = await cookies();
  const storedState = cookieStore.get("meta_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    return errorRedirect(request, "Invalid state token");
  }

  try {
    const membership = await requireTeamManagement();

    // Exchange code for a user token, then upgrade to a long-lived one so the
    // page tokens we derive from it do not expire.
    const tokenResponse = await exchangeMetaCodeForToken(code, state);
    const userToken = await exchangeForLongLivedUserToken(tokenResponse.access_token);

    // List the pages this user manages. Reviews live on the Page node and need
    // a page token — the user token cannot read them.
    const pages = await fetchMetaUserPages(userToken);
    const selection = categorizeMetaPageSelection(pages);

    if (selection.kind === "none") {
      return errorRedirect(
        request,
        "No Facebook Pages found for this account. Make sure you granted access to at least one Page.",
      );
    }

    if (selection.kind === "single") {
      await storeMetaPageConnection(membership.organizationId, selection.page);
      const url = new URL("/integrations", request.url);
      url.searchParams.set("facebook", "connected");
      url.searchParams.set("page", selection.page.name);
      const response = NextResponse.redirect(url);
      response.cookies.delete("meta_oauth_state");
      return response;
    }

    // Multiple pages — stash the user token and let the user pick one.
    const url = new URL("/integrations/facebook/select-page", request.url);
    const response = NextResponse.redirect(url);
    response.cookies.delete("meta_oauth_state");
    response.cookies.set(USER_TOKEN_COOKIE, encryptToken(userToken) ?? "", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return errorRedirect(request, message);
  }
}
