import { getGoogleSyncBannerCopy } from "@/lib/google-sync-banner";

type GoogleSyncBannerProps = {
  googleState?: string;
  syncedLocation?: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  totalCount: number;
  syncedLocations: number;
  failedLocations: number;
  failedLocationNames: string[];
  syncMessage?: string;
};

export function GoogleSyncBanner(props: GoogleSyncBannerProps) {
  const banner = getGoogleSyncBannerCopy(props);

  if (!banner) {
    return null;
  }

  const toneClasses =
    banner.tone === "success"
      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
      : banner.tone === "warning"
        ? "border border-amber-200 bg-amber-50 text-amber-800"
        : banner.tone === "error"
          ? "border border-rose-200 bg-rose-50 text-rose-800"
          : "border border-indigo-200 bg-indigo-50 text-indigo-700";

  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ${toneClasses}`}>
      <p>
        {banner.highlight ? (
          <>
            Google connection state: <span className="font-semibold">{banner.highlight}</span>
          </>
        ) : (
          banner.message
        )}
      </p>
      {banner.detail ? <p className="mt-2 text-xs font-medium">{banner.detail}</p> : null}
    </div>
  );
}
