import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/token-encryption";
import type { MetaPage } from "@/lib/meta-pages";

/**
 * Create or update the MetaAccountConnection for a selected Facebook Page.
 *
 * Stores the *page* access token (not the user token) so review syncs can read
 * the page's `ratings` edge. Page tokens derived from a long-lived user token do
 * not expire, so `expiresAt` is left null. Keyed on (organizationId, pageId) so
 * reconnecting the same page updates it in place instead of duplicating.
 */
export async function storeMetaPageConnection(organizationId: string, page: MetaPage) {
  const encryptedToken = encryptToken(page.access_token);

  const existing = await prisma.metaAccountConnection.findFirst({
    where: { organizationId, pageId: page.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.metaAccountConnection.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptedToken,
        tokenType: "page",
        expiresAt: null,
        pageName: page.name,
      },
    });
    return;
  }

  await prisma.metaAccountConnection.create({
    data: {
      organizationId,
      pageId: page.id,
      pageName: page.name,
      accessToken: encryptedToken,
      tokenType: "page",
      expiresAt: null,
      connectedAt: new Date(),
    },
  });
}
