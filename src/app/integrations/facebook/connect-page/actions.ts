"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireTeamManagement } from "@/lib/authz";
import { fetchMetaPageById } from "@/lib/meta-oauth";
import { normalizeMetaPageId } from "@/lib/meta-pages";
import { storeMetaPageConnection } from "@/lib/meta-connection";
import { decryptToken } from "@/lib/token-encryption";

const USER_TOKEN_COOKIE = "meta_user_token";

function errorRedirect(message: string): never {
  redirect(`/integrations/facebook/connect-page?error=${encodeURIComponent(message)}`);
}

/**
 * Connects one business-managed Page when Meta's user Page-list relation is
 * empty. The manually supplied numeric Page ID is never trusted by itself:
 * Meta must return a usable Page token for the current encrypted user token
 * before the organization-scoped connection is persisted.
 */
export async function connectMetaPageById(formData: FormData) {
  const membership = await requireTeamManagement();

  const pageId = normalizeMetaPageId(formData.get("pageId"));
  if (!pageId) {
    errorRedirect("Enter a valid numeric Facebook Page ID.");
  }

  const cookieStore = await cookies();
  const userToken = decryptToken(cookieStore.get(USER_TOKEN_COOKIE)?.value);
  if (!userToken) {
    errorRedirect("Your Facebook session expired. Please connect again.");
  }

  let page;
  try {
    page = await fetchMetaPageById(userToken, pageId);
    await storeMetaPageConnection(membership.organizationId, page);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Meta could not verify access to that Facebook Page.";
    errorRedirect(message);
  }

  cookieStore.delete(USER_TOKEN_COOKIE);
  redirect(`/integrations?facebook=connected&page=${encodeURIComponent(page.name)}`);
}
