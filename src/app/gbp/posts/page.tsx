export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { GbpPublishStatus } from "@prisma/client";
import { deleteGbpPostAction } from "@/app/gbp/actions";

const STATUS_LABELS: Record<GbpPublishStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  FAILED: "Failed",
};

const STATUS_COLORS: Record<GbpPublishStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-blue-50 text-blue-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
};

export default async function GbpPostsPage() {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const locationIds = await getCurrentAccessibleLocationIds();
  const posts = await prisma.gbpPost.findMany({
    where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
    include: { location: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <a href="/gbp" className="text-sm text-indigo-600 hover:underline">← GBP Manager</a>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">GBP Posts</h2>
          </div>
          <Link href="/gbp/posts/new" className="mt-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
            + New Post
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-700">No posts yet</p>
            <Link href="/gbp/posts/new" className="mt-4 inline-block rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              Create your first post
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {posts.map((post) => (
                <div key={post.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLORS[post.status]}`}>
                        {STATUS_LABELS[post.status]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {post.postType.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400">{post.location.name}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-2">{post.content}</p>
                    {post.scheduledAt && post.status === GbpPublishStatus.SCHEDULED && (
                      <p className="mt-1 text-xs text-slate-400">Scheduled: {post.scheduledAt.toLocaleString()}</p>
                    )}
                    {post.publishedAt && (
                      <p className="mt-1 text-xs text-slate-400">Published: {post.publishedAt.toLocaleString()}</p>
                    )}
                    {post.failureReason && (
                      <p className="mt-1 text-xs text-red-600">{post.failureReason}</p>
                    )}
                  </div>
                  <form action={async (fd) => { await deleteGbpPostAction(fd); }}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className="text-xs text-slate-400 hover:text-red-600 transition">Delete</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
