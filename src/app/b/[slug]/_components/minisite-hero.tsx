import type { ResolvedCta } from "@/lib/minisite-cta";
import type { ReviewSource } from "./source-badge";
import { SourceBadge } from "./source-badge";
import { VerifiedBadge } from "./verified-badge";

export interface MiniSiteHeroProps {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  avgRating?: number | null;
  reviewCount?: number | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  sources?: ReviewSource[];
  showVerified?: boolean;
  showSourceBadges?: boolean;
  primaryCta?: ResolvedCta | null;
  secondaryCta?: ResolvedCta | null;
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const filled = Math.round(rating);
  const starStyle = { color: "var(--star)" };
  return (
    <span style={starStyle} className={size === "lg" ? "text-2xl" : "text-sm"}>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
}

function ctaDataTrack(type: ResolvedCta["type"]): string {
  switch (type) {
    case "CALL": return "call";
    case "WEBSITE": return "website";
    case "DIRECTIONS": return "directions";
    case "REVIEW": return "review";
    default: return "cta";
  }
}

export function MiniSiteHero({
  name,
  description,
  logoUrl,
  heroImageUrl,
  avgRating,
  reviewCount,
  city,
  state,
  address,
  phone,
  sources = [],
  showVerified = false,
  showSourceBadges = true,
  primaryCta,
  secondaryCta,
}: MiniSiteHeroProps) {
  return (
    <section>
      {/* Hero banner */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-80">
        {heroImageUrl ? (
          <img src={heroImageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(circle at 20% 50%, color-mix(in srgb, var(--accent) 50%, transparent) 0%, transparent 60%), radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--accent) 35%, transparent) 0%, transparent 55%), linear-gradient(135deg, #0f2027 0%, #1a3a3a 50%, #0f2027 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      {/* Profile header */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative -mt-14 sm:-mt-16">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              className="h-24 w-24 rounded-2xl border-4 border-white object-contain bg-white shadow-lg sm:h-28 sm:w-28"
            />
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white shadow-lg sm:h-28 sm:w-28"
              style={{ background: "var(--accent)" }}
            >
              <span className="text-3xl font-bold text-white">
                {name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--ink-950)" }}>
              {name}
            </h1>
            {showVerified && <VerifiedBadge />}
          </div>

          {description && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-600)" }}>{description}</p>
          )}

          {avgRating != null && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StarRating rating={avgRating} />
              <span className="text-sm font-semibold" style={{ color: "var(--ink-700)" }}>
                {avgRating.toFixed(1)}
              </span>
              {reviewCount != null && reviewCount > 0 && (
                <span className="text-sm" style={{ color: "var(--ink-500)" }}>
                  ({reviewCount} reviews)
                </span>
              )}
              {(city || state) && (
                <>
                  <span style={{ color: "var(--ink-400)" }}>·</span>
                  <span className="text-sm" style={{ color: "var(--ink-500)" }}>
                    {[city, state].filter(Boolean).join(", ")}
                  </span>
                </>
              )}
            </div>
          )}

          {(address || phone) && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-500)" }}>
              {[address, phone].filter(Boolean).join(" · ")}
            </p>
          )}

          {showSourceBadges && sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sources.map((src) => (
                <SourceBadge key={src} source={src} />
              ))}
            </div>
          )}
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-3 border-b pb-5"
          style={{ borderColor: "var(--ink-200)" }}
        >
          {primaryCta && (
            <a
              href={primaryCta.href}
              target={primaryCta.external ? "_blank" : undefined}
              rel={primaryCta.external ? "noreferrer" : undefined}
              data-track="cta"
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {primaryCta.label}
            </a>
          )}
          {secondaryCta && (
            <a
              href={secondaryCta.href}
              target={secondaryCta.external ? "_blank" : undefined}
              rel={secondaryCta.external ? "noreferrer" : undefined}
              data-track={ctaDataTrack(secondaryCta.type)}
              className="rounded-2xl border px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-80"
              style={{
                borderColor: "var(--ink-200)",
                background: "var(--white)",
                color: "var(--ink-700)",
              }}
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
