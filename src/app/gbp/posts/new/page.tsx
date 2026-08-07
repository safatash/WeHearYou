export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { createGbpPostAction } from "@/app/gbp/actions";

export default async function NewGbpPostPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const query = (await searchParams) ?? {};
  const error = query.error;

  const locationIds = await getCurrentAccessibleLocationIds();
  const locations = await prisma.location.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(locationIds.length > 0 ? { id: { in: locationIds } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell activeScreen="gbp-manager">
      <div className="space-y-6 max-w-2xl">
        <div>
          <a href="/gbp/posts" className="text-sm text-indigo-600 hover:underline">← Posts</a>
          <h2 className="page-title">New GBP Post</h2>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "missing_fields" ? "Please fill in all required fields." : "An error occurred."}
          </div>
        )}

        <div className="panel">
          <form action={createGbpPostAction} className="space-y-5">
            <div>
              <label className="field-label">Location</label>
              <select name="locationId" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2">
                <option value="">Select a location…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Post type</label>
              <select name="postType" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2">
                <option value="WHATS_NEW">What&apos;s New</option>
                <option value="OFFER">Offer</option>
                <option value="EVENT">Event</option>
              </select>
            </div>

            <div>
              <label className="field-label">Content</label>
              <textarea name="content" required rows={5} placeholder="Write your post content…"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2" />
            </div>

            <div>
              <label className="field-label">Call-to-action URL <span className="font-normal text-slate-400">(optional)</span></label>
              <div className="flex gap-2">
                <select name="ctaType" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 focus:outline-none">
                  <option value="LEARN_MORE">Learn More</option>
                  <option value="BOOK">Book</option>
                  <option value="ORDER">Order</option>
                  <option value="SHOP">Shop</option>
                  <option value="SIGN_UP">Sign Up</option>
                  <option value="CALL">Call</option>
                </select>
                <input name="ctaUrl" type="url" placeholder="https://example.com/book"
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2" />
              </div>
            </div>

            <div>
              <label className="field-label">Schedule <span className="font-normal text-slate-400">(optional — leave blank to save as draft)</span></label>
              <input name="scheduledAt" type="datetime-local"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" name="publishNow" value="true" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                Publish now ↗
              </button>
              <button type="submit" name="publishNow" value="false" className="btn btn-primary">
                Save / Schedule
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
