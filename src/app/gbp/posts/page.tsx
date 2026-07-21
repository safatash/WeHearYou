export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { GbpPublishStatus } from "@prisma/client";
import { GbpPostsView } from "@/components/gbp/gbp-posts-view";

export default async function GbpPostsPage() {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const locationIds = await getCurrentAccessibleLocationIds();
  const [posts, locations] = await Promise.all([
    prisma.gbpPost.findMany({
      where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
      include: { location: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    prisma.location.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(locationIds.length > 0 ? { id: { in: locationIds } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const stats = {
    live: posts.filter((p) => p.status === GbpPublishStatus.PUBLISHED).length,
    scheduled: posts.filter((p) => p.status === GbpPublishStatus.SCHEDULED).length,
    drafts: posts.filter((p) => p.status === GbpPublishStatus.DRAFT).length,
    failed: posts.filter((p) => p.status === GbpPublishStatus.FAILED).length,
    expired: posts.filter((p) => p.status === GbpPublishStatus.EXPIRED).length,
  };

  return (
    <AppShell activeScreen="gbp-posts">
      <GbpPostsView posts={posts} locations={locations} stats={stats} />
    </AppShell>
  );
}
