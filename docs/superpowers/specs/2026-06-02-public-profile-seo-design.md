# Public Profile SEO Design

## Goal

Improve the search discoverability of `/b/[slug]` pages by adding dynamic metadata, canonical URLs, Open Graph tags, a richer JSON-LD schema, a `sitemap.xml` listing all eligible profiles, and a `robots.txt`. All SEO logic is centralized in `src/lib/seo.ts` and kept as pure functions so it can be unit tested without Next.js or Prisma.

---

## SEO Eligibility

A profile is **eligible for indexing** when:
- `location.publicProfile` exists **and**
- `location.publicProfile.schemaEnabled === true`

Ineligible profiles receive `robots: { index: false, follow: false }` in their `generateMetadata` output. They are excluded from the sitemap entirely.

---

## Architecture

### `src/lib/seo.ts`

Single source of truth for all SEO output. Exports pure helper functions and two main builders.

#### Pure helpers (all exported, all stateless, all testable)

**`isEligibleForIndexing(profile: { schemaEnabled: boolean } | null | undefined): boolean`**
- Returns `profile?.schemaEnabled === true`; false for null/undefined

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

**`pickOgImage(logoUrl: string | null | undefined, heroImageUrl: string | null | undefined): string | null`**
- Returns `logoUrl` if non-empty, else `heroImageUrl` if non-empty, else `null`
- Callers must not include `og:image` when this returns `null`

**`sanitizeReviewText(text: string | null | undefined): string`**
- Returns `""` for null/undefined/empty
- Trims whitespace
- Escapes `&`, `<`, `>`, `"`, `'` as HTML entities (prevents XSS in JSON-LD)
- Truncates to 500 characters

#### `buildLocationMetadata(location: PublicLocationProfile, baseUrl: string): Metadata`

```ts
const eligible = isEligibleForIndexing(location.publicProfile)
const stats = getPublicProfileStats(location)
const title = buildPageTitle(location.name, location.city ?? null, location.state ?? null)
const description = buildPageDescription(
  location.name, location.city ?? null, location.state ?? null,
  stats.ratingCount, stats.averageRating,
  location.publicProfile?.showAiReviewSummary ? (location.publicProfile.aiReviewSummary ?? null) : null
)
const canonical = buildCanonicalUrl(baseUrl, location.slug)
const ogImage = pickOgImage(location.publicProfile?.logoUrl, location.publicProfile?.heroImageUrl)

return {
  title,
  description,
  robots: eligible ? { index: true, follow: true } : { index: false, follow: false },
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

- All existing fields: `@type`, `name`, `telephone`, `email`, `address`, `aggregateRating`, `review`
- **New:** `url`: `buildCanonicalUrl(baseUrl, location.slug)`
- **New:** `image`: `pickOgImage(logoUrl, heroImageUrl)` — omitted (not null) when not set
- **New:** `sameAs`: `[profile.googleMapsUrl]` if set — omitted when not set
- **Enhanced:** review `reviewBody` and author `name` both run through `sanitizeReviewText()`
- All optional fields use `undefined` (not `null`) so `JSON.stringify` omits them cleanly

---

### `src/app/b/[slug]/page.tsx`

Add `generateMetadata` export:

```ts
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const location = await getPublicLocationBySlug(params.slug)
  if (!location) return {}
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app"
  return buildLocationMetadata(location, baseUrl)
}
```

Update `buildLocalBusinessSchema` import: `public-profile` → `seo`. Pass `baseUrl` as second argument.

---

### `src/app/sitemap.ts`

```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app"
  const locations = await prisma.location.findMany({
    where: { publicProfile: { schemaEnabled: true } },
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

Only locations with `schemaEnabled: true` are included.

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
  isEligibleForIndexing, buildPageTitle, buildPageDescription,
  buildCanonicalUrl, pickOgImage, sanitizeReviewText,
} from "./seo"

// isEligibleForIndexing
test("isEligibleForIndexing: false for null", () => assert.equal(isEligibleForIndexing(null), false))
test("isEligibleForIndexing: false when schemaEnabled false", () => assert.equal(isEligibleForIndexing({ schemaEnabled: false }), false))
test("isEligibleForIndexing: true when schemaEnabled true", () => assert.equal(isEligibleForIndexing({ schemaEnabled: true }), true))

// buildPageTitle
test("buildPageTitle: includes city and state", () => assert.equal(buildPageTitle("Acme", "Miami", "FL"), "Acme Reviews | Miami, FL"))
test("buildPageTitle: city only", () => assert.equal(buildPageTitle("Acme", "Miami", null), "Acme Reviews | Miami"))
test("buildPageTitle: state only", () => assert.equal(buildPageTitle("Acme", null, "FL"), "Acme Reviews | FL"))
test("buildPageTitle: neither", () => assert.equal(buildPageTitle("Acme", null, null), "Acme — Customer Reviews"))

// buildPageDescription
test("buildPageDescription: uses AI summary when present", () => {
  const result = buildPageDescription("Acme", "Miami", "FL", 47, 4.8, "Great service.")
  assert.equal(result, "Great service.")
})
test("buildPageDescription: template when no summary and reviews exist", () => {
  const result = buildPageDescription("Acme", "Miami", "FL", 47, 4.8, null)
  assert.ok(result.includes("47") && result.includes("Miami") && result.includes("4.8"))
})
test("buildPageDescription: no rating when review count is 0", () => {
  const result = buildPageDescription("Acme", "Miami", "FL", 0, 0, null)
  assert.ok(!result.includes("stars") && result.includes("Acme"))
})

// buildCanonicalUrl
test("buildCanonicalUrl: returns absolute URL", () => assert.equal(buildCanonicalUrl("https://wehearyou.com", "acme-dental"), "https://wehearyou.com/b/acme-dental"))
test("buildCanonicalUrl: strips trailing slash", () => assert.equal(buildCanonicalUrl("https://wehearyou.com/", "acme-dental"), "https://wehearyou.com/b/acme-dental"))

// pickOgImage
test("pickOgImage: prefers logoUrl", () => assert.equal(pickOgImage("logo.png", "hero.png"), "logo.png"))
test("pickOgImage: falls back to heroImageUrl", () => assert.equal(pickOgImage(null, "hero.png"), "hero.png"))
test("pickOgImage: returns null when neither set", () => assert.equal(pickOgImage(null, null), null))

// sanitizeReviewText
test("sanitizeReviewText: empty string for null", () => assert.equal(sanitizeReviewText(null), ""))
test("sanitizeReviewText: escapes HTML entities", () => assert.equal(sanitizeReviewText("<script>"), "&lt;script&gt;"))
test("sanitizeReviewText: truncates at 500 chars", () => assert.equal(sanitizeReviewText("a".repeat(600)).length, 500))
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
