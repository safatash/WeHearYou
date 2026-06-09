export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";
import { notFound } from "next/navigation";
import { GbpPublishStatus } from "@prisma/client";
import { uploadGbpPhotoAction, deleteGbpPhotoAction } from "@/app/gbp/actions";

const CATEGORIES = ["EXTERIOR", "INTERIOR", "FOOD", "MENU", "AT_WORK", "TEAM", "ADDITIONAL"];

export default async function GbpPhotosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const membership = await getCurrentMembership();
  if (!membership) notFound();

  const query = (await searchParams) ?? {};
  const tab = query.tab === "upload" ? "upload" : "gallery";

  const locationIds = await getCurrentAccessibleLocationIds();

  const [locations, photos] = await Promise.all([
    prisma.location.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(locationIds.length > 0 ? { id: { in: locationIds } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.gbpPhoto.findMany({
      where: locationIds.length > 0 ? { locationId: { in: locationIds } } : {},
      include: { location: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const publishedPhotos = photos.filter((p) => p.status === GbpPublishStatus.PUBLISHED);
  const pendingPhotos = photos.filter((p) => p.status !== GbpPublishStatus.PUBLISHED);

  return (
    <AppShell activeScreen="gbp-photos">
      <div className="space-y-6 max-w-4xl">
        <div>
          <a href="/gbp" className="text-sm text-indigo-600 hover:underline">← GBP Manager</a>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Photo Management</h2>
        </div>

        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 w-fit">
          <a href="/gbp/photos?tab=gallery" className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "gallery" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Live on Google ({publishedPhotos.length})
          </a>
          <a href="/gbp/photos?tab=upload" className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Upload
          </a>
        </div>

        {tab === "upload" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950 mb-5">Upload a photo</h3>
            <form action={uploadGbpPhotoAction} encType="multipart/form-data" className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
                <select name="locationId" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="">Select a location…</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Photo</label>
                <input name="photo" type="file" accept="image/*" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                <select name="category" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Schedule <span className="font-normal text-slate-400">(optional)</span></label>
                <input name="scheduledAt" type="datetime-local" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" name="publishNow" value="true" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition">
                  Publish now ↗
                </button>
                <button type="submit" name="publishNow" value="false" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
                  Save / Schedule
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === "gallery" && (
          <>
            {pendingPhotos.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">Pending / Scheduled</p>
                <div className="divide-y divide-slate-100">
                  {pendingPhotos.map((photo) => (
                    <div key={photo.id} className="flex items-center gap-4 py-3">
                      <img src={photo.storageUrl} alt="" className="h-14 w-14 rounded-xl object-cover border border-slate-200" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">{photo.category} · {photo.location.name}</p>
                        <p className="text-xs text-slate-400">{photo.status}{photo.scheduledAt ? ` · ${photo.scheduledAt.toLocaleString()}` : ""}</p>
                        {photo.failureReason && <p className="text-xs text-red-600">{photo.failureReason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">Live on Google ({publishedPhotos.length})</p>
              {publishedPhotos.length === 0 ? (
                <p className="text-sm text-slate-500">No published photos yet. <a href="/gbp/photos?tab=upload" className="text-indigo-600 hover:underline">Upload one →</a></p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {publishedPhotos.map((photo) => (
                    <div key={photo.id} className="group relative rounded-2xl overflow-hidden border border-slate-200">
                      <img src={photo.storageUrl} alt="" className="h-32 w-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <form action={async (fd) => { await deleteGbpPhotoAction(fd); }}>
                          <input type="hidden" name="photoId" value={photo.id} />
                          <button type="submit" className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Delete</button>
                        </form>
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[10px] text-slate-500 truncate">{photo.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
