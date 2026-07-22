"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireTeamManagement } from "@/lib/authz";
import { decryptToken } from "@/lib/token-encryption";
import { fetchMetaUserPages } from "@/lib/meta-oauth";
import { storeMetaPageConnection } from "@/lib/meta-connection";

const USER_TOKEN_COOKIE = "meta_user_token";

function errorRedirect(message: string): never {
  redirect(`/integrations?facebook=auth-error&message=${encodeURIComponent(message)}`);
}

export async function connectSelectedMetaPage(formData: FormData) {
  const membership = await requireTeamManagement();

  const cookieStore = await cookies();
  const userToken = decryptToken(cookieStore.get(USER_TOKEN_COOKIE)?.value);
  if (!userToken) {
    errorRedirect("Your Facebook session expired. Please connect again.");
  }

  const pageId = String(formData.get("pageId") ?? "").trim();
  if (!pageId) {
    errorRedirect("No page selected.");
  }

  // Re-fetch pages so the page token is read server-side and never round-trips
  // through the browser.
  const pages = await fetchMetaUserPages(userToken);
  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    errorRedirect("That page is no longer available on your account.");
  }

  await storeMetaPageConnection(membership.organizationId, page);

  cookieStore.delete(USER_TOKEN_COOKIE);
  redirect(`/integrations?facebook=connected&page=${encodeURIComponent(page.name)}`);
}
