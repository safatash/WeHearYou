# Public Profile SEO Design

## Goal

Improve the search discoverability of `/b/[slug]` pages by adding dynamic metadata, canonical URLs, Open Graph tags, a richer JSON-LD schema, a `sitemap.xml` listing all eligible profiles, and a `robots.txt`. All SEO logic is centralized in `src/lib/seo.ts` and kept as pure functions so it can be unit tested without Next.js or Prisma.

---

## SEO Eligibility

A profile is **indexable** when all of the following are true:
- `location.publicProfile` is not null
- `location.publicProfile.schemaEnabled === true`
- `location.slug` is non-empty
- `location.name` is non-empty

Ineligible profiles receive `robots: { index: false, follow: false }` in their `generateMetadata` output. They are excluded from the sitemap entirely.

---

## Architecture

### `src/lib/seo.ts`

Single source of truth for all SEO output. Exports pure helper functions and two main builders.

#### Pure helpers (all exported, all stateless, all testable)

**`isPublicProfileIndexable(location: { name: string; slug: string; publicProfile: { schemaEnabled: boolean } | null }): boolean`**
- Returns `true` only when: `publicProfile` is non-null, `schemaEnabled === true`, `slug.trim()` is non-empty, `name.trim()` is non-empty

**`buildPageTitle(name: string, city: string | null, state: string | null): string`**
- Both present: `"{name} Reviews | {city}, {state}"`
- City only: `"{name} Reviews | {city}"`
- State only: `"{name} Reviews | {state}"`
- Neither: `"{name} — Customer Reviews"`

**`buildPageDescription(name: string, city: string | null, state: string | null, reviewCount: number, avgRating: number, aiSummary: string | null): string`**
- If `aiSummary` is non-null and non-empty: return `aiSummary` verbatim
- Else if `reviewCount > 0`: `"Read {reviewCount} customer reviews for {name}{location}. Rated {avg} stars."` where `{location}` is `" in {city}, {state}"` / `" in {city}"` / `" in {state}"` / `""` depending on availability; `{avg}` is rounded to 1 decimal
- Else (no reviews): `"Discover {name}{location} on WeHearYou."` with the same location fallbacks

**`buildCanonicalUrl(baseUrl: string, slug: string): string`**
- Strips trailing slash from `baseUrl`
- Returns `"{baseUrl}/b/{slug}"`
- `baseUrl` must already be absolute (callers pass `process.env.NEXT_PUBLIC_APP_URL`)

**`pickOgImage(heroImageUrl: string | null | undefined, logoUrl: string | null | undefined, defaultImageUrl: string | null | undefined): string | null`**
- Preference order: `heroImageUrl` → `logoUrl` → `defaultImageUrl` → `null`
- Returns the first non-empty string value, or `null` if none are set
- Callers must not include `og:image` when this returns `null`

**`sanitizeReviewText(text: string | null | undefined): string`**
- Returns `""` for null/undefined/empty
- Strips HTML tags (removes anything matching `/<[^>]*>/g`)
- Trims leading/trailing whitespace
- Truncates to 500 characters

#### `buildLocationMetadata(location: PublicLocationProfile, baseUrl: string, defaultOgImage?: string | null): Metadata`

```ts
const indexable = isPublicProfileIndexable(location)
const stats = getPublicProfileStats(location)
const title = buildPageTitle(location.name, location.city ?? null, location.state ?? null)
const description = buildPageDescription(
  location.name, location.city ?? null, location.state ?? null,
  stats.ratingCount, stats.averageRating,
  location.publicProfile?.showAiReviewSummary ? (location.publicProfile.aiReviewSummary ?? null) : null
)
const canonical = buildCanonicalUrl(baseUrl, location.slug)
const ogImage = pickOgImage(
  location.publicProfile?.heroImageUrl,
  location.publicProfile?.logoUrl,
  defaultOgImage ?? null
)

return {
  title,
  description,
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  alternates: { canonical },
  openGraph: {
    title,
    description,
    url: canonical,
    type: "website",
    ...(ogImage ? { images: [{ url: ogImage }] } : {}),
  },
  twitter: {
    card: ogImage ? "summary_large_image" : "summary",
    title,
    description,
  },
}
```

#### `buildLocalBusinessSchema(location: PublicLocationProfile, baseUrl: string): object`

Moved from `src/lib/public-profile.ts` and enhanced:

- `@context`: `"https://schema.org"`
- `@type`: `profile.businessType ?? "LocalBusiness"`
- **New:** `@id`: `buildCanonicalUrl(baseUrl, location.slug)`
- `name`, `telephone`, `email`, `address` (existing, unchanged)
- **New:** `url`: `buildCanonicalUrl(baseUrl, location.slug)`
- **New:** `image`: `pickOgImage(heroImageUrl, logoUrl, null)` — omitted when `null`
- **New:** `sameAs`: `[profile.googleMapsUrl]` if set — omitted when not set
- `aggregateRating`: only when `stats.ratingCount > 0` (existing, unchanged)
- `review`: up to 5 reviews — **only** those with `status === ReviewStatus.PUBLISHED` and `source` in `[ReviewSource.GOOGLE, ReviewSource.FACEBOOK]`; `reviewBody` and author `name` both run through `sanitizeReviewText()`
- All optional fields use `undefined` (not `null`) so `JSON.stringify` omits them cleanly

---

### `src/app/b/[slug]/page.tsx`

Add `generateMetadata` export:

```ts
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const location = await getPublicLocationBySlug(params.slug)
  if (!location) return {}
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app"
  const defaultOgImage = process.env.NEXT_PUBLIC_OG_IMAGE ?? null
  return buildLocationMetadata(location, baseUrl, defaultOgImage)
}
```

Update `buildLocalBusinessSchema` import: `public-profile` → `seo`. Pass `baseUrl` as second argument.

---

### `src/app/sitemap.ts`

```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app"
  const locations = await prisma.location.findMany({
    where: {
      publicProfile: { schemaEnabled: true },
      slug: { not: "" },
      name: { not: "" },
    },
    select: { slug: true, updatedAt: true },
  })
  return locations.map((loc) => ({
    url: buildCanonicalUrl(baseUrl, loc.slug),
    lastModified: loc.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))
}
```

Filters match `isPublicProfileIndexable` — only locations with `schemaEnabled: true`, non-empty slug, and non-empty name.

---

### `src/app/robots.ts`

```ts
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app"
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
```

---

### `src/lib/public-profile.ts`

Remove the `buildLocalBusinessSchema` export (moved to `seo.ts`). No other changes.

---

## Tests — `src/lib/seo.test.ts`

Uses `node:test` and `node:assert/strict` (same as existing tests in the project).

```ts
import test from "node:test"
import assert from "node:assert/strict"
import {
  isPublicProfileIndexable, buildPageTitle, buildPageDescription,
  buildCanonicalUrl, pickOgImage, sanitizeReviewText,
  buildLocationMetadata, buildLocalBusinessSchema,
} from "./seo"

// --- isPublicProfileIndexable ---
test("isPublicProfileIndexable: false when no public profile", () =>
  assert.equal(isPublicProfileIndexable({ name: "Acme", slug: "acme", publicProfile: null }), false))
test("isPublicProfileIndexable: false when schemaEnabled false", () =>
  assert.equal(isPublicProfileIndexable({ name: "Acme", slug: "acme", publicProfile: { schemaEnabled: false } }), false))
test("isPublicProfileIndexable: false when slug is empty", () =>
  assert.equal(isPublicProfileIndexable({ name: "Acme", slug: "", publicProfile: { schemaEnabled: true } }), false))
test("isPublicProfileIndexable: false when name is empty", () =>
  assert.equal(isPublicProfileIndexable({ name: "", slug: "acme", publicProfile: { schemaEnabled: true } }), false))
test("isPublicProfileIndexable: true when all conditions met", () =>
  assert.equal(isPublicProfileIndexable({ name: "Acme", slug: "acme", publicProfile: { schemaEnabled: true } }), true))

// --- buildPageTitle ---
test("buildPageTitle: city and state", () => assert.equal(buildPageTitle("Acme", "Miami", "FL"), "Acme Reviews | Miami, FL"))
test("buildPageTitle: city only", () => assert.equal(buildPageTitle("Acme", "Miami", null), "Acme Reviews | Miami"))
test("buildPageTitle: state only", () => assert.equal(buildPageTitle("Acme", null, "FL"), "Acme Reviews | FL"))
test("buildPageTitle: neither", () => assert.equal(buildPageTitle("Acme", null, null), "Acme — Customer Reviews"))

// --- buildPageDescription ---
test("buildPageDescription: uses AI summary when present", () =>
  assert.equal(buildPageDescription("Acme", "Miami", "FL", 47, 4.8, "Great service."), "Great service."))
test("buildPageDescription: template with reviews", () => {
  const r = buildPageDescription("Acme", "Miami", "FL", 47, 4.8, null)
  assert.ok(r.includes("47") && r.includes("Miami") && r.includes("4.8"))
})
test("buildPageDescription: no rating when zero reviews", () => {
  const r = buildPageDescription("Acme", "Miami", "FL", 0, 0, null)
  assert.ok(!r.includes("stars") && r.includes("Acme"))
})

// --- buildCanonicalUrl ---
test("buildCanonicalUrl: absolute URL", () =>
  assert.equal(buildCanonicalUrl("https://wehearyou.com", "acme"), "https://wehearyou.com/b/acme"))
test("buildCanonicalUrl: strips trailing slash", () =>
  assert.equal(buildCanonicalUrl("https://wehearyou.com/", "acme"), "https://wehearyou.com/b/acme"))

// --- pickOgImage ---
test("pickOgImage: prefers heroImageUrl over logoUrl", () =>
  assert.equal(pickOgImage("hero.png", "logo.png", null), "hero.png"))
test("pickOgImage: falls back to logoUrl when no hero", () =>
  assert.equal(pickOgImage(null, "logo.png", null), "logo.png"))
test("pickOgImage: falls back to defaultImageUrl when neither set", () =>
  assert.equal(pickOgImage(null, null, "default.png"), "default.png"))
test("pickOgImage: returns null when nothing set", () =>
  assert.equal(pickOgImage(null, null, null), null))

// --- sanitizeReviewText ---
test("sanitizeReviewText: empty string for null", () => assert.equal(sanitizeReviewText(null), ""))
test("sanitizeReviewText: strips HTML tags", () => assert.equal(sanitizeReviewText("<b>Great</b>"), "Great"))
test("sanitizeReviewText: trims whitespace", () => assert.equal(sanitizeReviewText("  hello  "), "hello"))
test("sanitizeReviewText: truncates at 500 chars", () => assert.equal(sanitizeReviewText("a".repeat(600)).length, 500))

// --- buildLocationMetadata ---
const baseLocation = {
  name: "Acme Dental",
  slug: "acme-dental",
  city: "Miami",
  state: "FL",
  publicProfile: { schemaEnabled: true, heroImageUrl: null, logoUrl: null,
    showAiReviewSummary: false, aiReviewSummary: null },
  reviews: [],
  videoTestimonials: [],
}

test("buildLocationMetadata: sets correct title", () => {
  const meta = buildLocationMetadata(baseLocation as any, "https://wehearyou.com")
  assert.equal(meta.title, "Acme Dental Reviews | Miami, FL")
})
test("buildLocationMetadata: sets canonical URL", () => {
  const meta = buildLocationMetadata(baseLocation as any, "https://wehearyou.com")
  assert.equal((meta.alternates as any)?.canonical, "https://wehearyou.com/b/acme-dental")
})
test("buildLocationMetadata: robots index true when eligible", () => {
  const meta = buildLocationMetadata(baseLocation as any, "https://wehearyou.com")
  assert.deepEqual(meta.robots, { index: true, follow: true })
})
test("buildLocationMetadata: robots noindex when schemaEnabled false", () => {
  const loc = { ...baseLocation, publicProfile: { ...baseLocation.publicProfile, schemaEnabled: false } }
  const meta = buildLocationMetadata(loc as any, "https://wehearyou.com")
  assert.deepEqual(meta.robots, { index: false, follow: false })
})
test("buildLocationMetadata: og:image uses hero over logo", () => {
  const loc = { ...baseLocation, publicProfile: { ...baseLocation.publicProfile, heroImageUrl: "hero.png", logoUrl: "logo.png" } }
  const meta = buildLocationMetadata(loc as any, "https://wehearyou.com")
  assert.equal((meta.openGraph as any)?.images?.[0]?.url, "hero.png")
})
test("buildLocationMetadata: uses default OG image when no hero or logo", () => {
  const meta = buildLocationMetadata(baseLocation as any, "https://wehearyou.com", "default.png")
  assert.equal((meta.openGraph as any)?.images?.[0]?.url, "default.png")
})
test("buildLocationMetadata: no og:image key when nothing set", () => {
  const meta = buildLocationMetadata(baseLocation as any, "https://wehearyou.com", null)
  assert.equal((meta.openGraph as any)?.images, undefined)
})

// --- buildLocalBusinessSchema ---
test("buildLocalBusinessSchema: includes @id", () => {
  const schema = buildLocalBusinessSchema(baseLocation as any, "https://wehearyou.com")
  assert.equal((schema as any)["@id"], "https://wehearyou.com/b/acme-dental")
})
test("buildLocalBusinessSchema: includes url", () => {
  const schema = buildLocalBusinessSchema(baseLocation as any, "https://wehearyou.com")
  assert.equal((schema as any).url, "https://wehearyou.com/b/acme-dental")
})
test("buildLocalBusinessSchema: omits image when not set", () => {
  const schema = buildLocalBusinessSchema(baseLocation as any, "https://wehearyou.com")
  assert.equal((schema as any).image, undefined)
})
test("buildLocalBusinessSchema: only includes published Google/Facebook reviews", () => {
  const loc = {
    ...baseLocation,
    reviews: [
      { status: "PUBLISHED", source: "GOOGLE", reviewerName: "Jane", body: "Great!", rating: 5 },
      { status: "PENDING", source: "GOOGLE", reviewerName: "Bob", body: "Ok", rating: 3 },
      { status: "PUBLISHED", source: "INTERNAL", reviewerName: "Sue", body: "Fine", rating: 4 },
    ],
  }
  const schema = buildLocalBusinessSchema(loc as any, "https://wehearyou.com")
  assert.equal((schema as any).review?.length, 1)
  assert.equal((schema as any).review?.[0]?.author?.name, "Jane")
})
test("buildLocalBusinessSchema: sanitizes review body", () => {
  const loc = {
    ...baseLocation,
    reviews: [{ status: "PUBLISHED", source: "GOOGLE", reviewerName: "Jane", body: "<b>Amazing</b>", rating: 5 }],
  }
  const schema = buildLocalBusinessSchema(loc as any, "https://wehearyou.com")
  assert.equal((schema as any).review?.[0]?.reviewBody, "Amazing")
})
```

---

## Files

| Action | File |
|--------|------|
| Create | `src/lib/seo.ts` |
| Create | `src/lib/seo.test.ts` |
| Create | `src/app/sitemap.ts` |
| Create | `src/app/robots.ts` |
| Modify | `src/app/b/[slug]/page.tsx` — add `generateMetadata`, update schema import |
| Modify | `src/lib/public-profile.ts` — remove `buildLocalBusinessSchema` export |

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_APP_URL` | Base URL for canonical URLs and sitemap | Yes (already in use) |
| `NEXT_PUBLIC_OG_IMAGE` | Default branded OG image URL when no hero/logo is set | Optional |
