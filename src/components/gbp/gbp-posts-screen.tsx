import { GbpPublishStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GbpPostsView } from "@/components/gbp/gbp-posts-view";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { prisma } from "@/lib/prisma";

interface GbpPostsScreenProps {
  openComposerFromRoute?: boolean;
}

/**
 * Shared, server-authorized GBP posts surface. The canonical create route uses
 * the same data and permissions as the posts list, differing only by whether
 * the right-side composer is opened initially.
 */
export async function GbpPostsScreen({
  openComposerFromRoute = false,
}: GbpPostsScreenProps) {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const locationIds = await getCurrentAccessibleLocationIds();
  const [posts, locations] = await Promise.all([
    prisma.gbpPost.findMany({
      where: {
        location: {
          organizationId: membership.organizationId,
          id: { in: locationIds },
        },
      },
      include: { location: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    prisma.location.findMany({
      where: {
        organizationId: membership.organizationId,
        id: { in: locationIds },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const stats = {
    live: posts.filter((post) => post.status === GbpPublishStatus.PUBLISHED).length,
    scheduled: posts.filter((post) => post.status === GbpPublishStatus.SCHEDULED).length,
    drafts: posts.filter((post) => post.status === GbpPublishStatus.DRAFT).length,
    failed: posts.filter((post) => post.status === GbpPublishStatus.FAILED).length,
    expired: posts.filter((post) => post.status === GbpPublishStatus.EXPIRED).length,
  };

  return (
    <AppShell activeScreen="gbp-posts">
      <GbpPostsView
        posts={posts}
        locations={locations}
        stats={stats}
        openComposerFromRoute={openComposerFromRoute}
      />
    </AppShell>
  );
}
