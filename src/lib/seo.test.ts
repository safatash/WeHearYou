import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicProfileIndexable,
  buildPageTitle,
  buildPageDescription,
  buildCanonicalUrl,
  pickOgImage,
  sanitizeReviewText,
  buildLocationMetadata,
  buildLocalBusinessSchema,
  type SeoLocation,
} from "./seo.ts";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const basePublicProfile = {
  schemaEnabled: true,
  heroImageUrl: null,
  logoUrl: null,
  googleMapsUrl: null,
  businessType: null,
  phone: null,
  email: null,
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  showAiReviewSummary: false,
  aiReviewSummary: null,
  showReviews: true,
  showTestimonials: true,
};

const baseLocation: SeoLocation = {
  name: "Acme Dental",
  slug: "acme-dental",
  city: "Austin",
  state: "TX",
  avgRating: 4.5,
  publicProfile: { ...basePublicProfile },
  reviews: [],
};

const BASE_URL = "https://wehearyou.com";

// ─── isPublicProfileIndexable ─────────────────────────────────────────────────

test("isPublicProfileIndexable: false when no profile", () => {
  assert.equal(
    isPublicProfileIndexable({ name: "Acme", slug: "acme", publicProfile: null }),
    false,
  );
});

test("isPublicProfileIndexable: false when schemaEnabled is false", () => {
  assert.equal(
    isPublicProfileIndexable({
      name: "Acme",
      slug: "acme",
      publicProfile: { ...basePublicProfile, schemaEnabled: false },
    }),
    false,
  );
});

test("isPublicProfileIndexable: false when slug is empty", () => {
  assert.equal(
    isPublicProfileIndexable({
      name: "Acme",
      slug: "",
      publicProfile: { ...basePublicProfile },
    }),
    false,
  );
});

test("isPublicProfileIndexable: false when slug is whitespace only", () => {
  assert.equal(
    isPublicProfileIndexable({
      name: "Acme",
      slug: "   ",
      publicProfile: { ...basePublicProfile },
    }),
    false,
  );
});

test("isPublicProfileIndexable: false when name is empty", () => {
  assert.equal(
    isPublicProfileIndexable({
      name: "",
      slug: "acme",
      publicProfile: { ...basePublicProfile },
    }),
    false,
  );
});

test("isPublicProfileIndexable: false when name is whitespace only", () => {
  assert.equal(
    isPublicProfileIndexable({
      name: "   ",
      slug: "acme",
      publicProfile: { ...basePublicProfile },
    }),
    false,
  );
});

test("isPublicProfileIndexable: true when all conditions met", () => {
  assert.equal(
    isPublicProfileIndexable({
      name: "Acme Dental",
      slug: "acme-dental",
      publicProfile: { ...basePublicProfile },
    }),
    true,
  );
});

// ─── buildPageTitle ───────────────────────────────────────────────────────────

test("buildPageTitle: city and state", () => {
  assert.equal(buildPageTitle("Acme Dental", "Austin", "TX"), "Acme Dental Reviews | Austin, TX");
});

test("buildPageTitle: city only", () => {
  assert.equal(buildPageTitle("Acme Dental", "Austin", null), "Acme Dental Reviews | Austin");
});

test("buildPageTitle: state only", () => {
  assert.equal(buildPageTitle("Acme Dental", null, "TX"), "Acme Dental Reviews | TX");
});

test("buildPageTitle: neither city nor state", () => {
  assert.equal(buildPageTitle("Acme Dental", null, null), "Acme Dental — Customer Reviews");
});

// ─── buildPageDescription ─────────────────────────────────────────────────────

test("buildPageDescription: uses AI summary when present", () => {
  const result = buildPageDescription("Acme", "Austin", "TX", 10, 4.5, "Great dental care!");
  assert.equal(result, "Great dental care!");
});

test("buildPageDescription: template with reviews includes count, city, avg", () => {
  const result = buildPageDescription("Acme Dental", "Austin", "TX", 25, 4.3, null);
  assert.ok(result.includes("25"), "should include review count");
  assert.ok(result.includes("Austin"), "should include city");
  assert.ok(result.includes("4.3"), "should include avg rating");
  assert.ok(result.includes("stars"), "should include 'stars'");
});

test("buildPageDescription: no 'stars' in output when zero reviews", () => {
  const result = buildPageDescription("Acme Dental", "Austin", "TX", 0, 0, null);
  assert.ok(!result.includes("stars"), "should not include 'stars'");
});

test("buildPageDescription: no city in template when city is null", () => {
  const result = buildPageDescription("Acme Dental", null, "TX", 5, 4.0, null);
  assert.ok(!result.includes("null"), "should not include literal 'null'");
  assert.ok(result.includes("TX"), "should still include state");
});

// ─── buildCanonicalUrl ────────────────────────────────────────────────────────

test("buildCanonicalUrl: absolute URL with slug", () => {
  assert.equal(buildCanonicalUrl("https://wehearyou.com", "acme-dental"), "https://wehearyou.com/b/acme-dental");
});

test("buildCanonicalUrl: strips trailing slash from baseUrl", () => {
  assert.equal(buildCanonicalUrl("https://wehearyou.com/", "acme-dental"), "https://wehearyou.com/b/acme-dental");
});

// ─── pickOgImage ──────────────────────────────────────────────────────────────

test("pickOgImage: prefers hero over logo", () => {
  assert.equal(pickOgImage("https://hero.jpg", "https://logo.jpg", null), "https://hero.jpg");
});

test("pickOgImage: falls back to logo when no hero", () => {
  assert.equal(pickOgImage(null, "https://logo.jpg", null), "https://logo.jpg");
});

test("pickOgImage: falls back to default when neither hero nor logo", () => {
  assert.equal(pickOgImage(null, null, "https://default.jpg"), "https://default.jpg");
});

test("pickOgImage: returns null when nothing set", () => {
  assert.equal(pickOgImage(null, null, null), null);
});

// ─── sanitizeReviewText ───────────────────────────────────────────────────────

test("sanitizeReviewText: null returns empty string", () => {
  assert.equal(sanitizeReviewText(null), "");
});

test("sanitizeReviewText: strips HTML tags", () => {
  assert.equal(sanitizeReviewText("<b>Great</b>"), "Great");
});

test("sanitizeReviewText: trims whitespace", () => {
  assert.equal(sanitizeReviewText("  hello  "), "hello");
});

test("sanitizeReviewText: truncates at 500 chars", () => {
  const longText = "a".repeat(600);
  const result = sanitizeReviewText(longText);
  assert.equal(result.length, 500);
});

// ─── buildLocationMetadata ────────────────────────────────────────────────────

test("buildLocationMetadata: title matches expected format", () => {
  const meta = buildLocationMetadata(baseLocation, BASE_URL);
  assert.equal(meta.title, "Acme Dental Reviews | Austin, TX");
});

test("buildLocationMetadata: canonical URL is correct", () => {
  const meta = buildLocationMetadata(baseLocation, BASE_URL);
  assert.equal(meta.alternates?.canonical, "https://wehearyou.com/b/acme-dental");
});

test("buildLocationMetadata: robots index:true follow:true when eligible", () => {
  const meta = buildLocationMetadata(baseLocation, BASE_URL);
  assert.deepEqual(meta.robots, { index: true, follow: true });
});

test("buildLocationMetadata: robots index:false follow:false when schemaEnabled false", () => {
  const location: SeoLocation = {
    ...baseLocation,
    publicProfile: { ...basePublicProfile, schemaEnabled: false },
  };
  const meta = buildLocationMetadata(location, BASE_URL);
  assert.deepEqual(meta.robots, { index: false, follow: false });
});

test("buildLocationMetadata: og:image uses hero when set", () => {
  const location: SeoLocation = {
    ...baseLocation,
    publicProfile: { ...basePublicProfile, heroImageUrl: "https://hero.jpg", logoUrl: "https://logo.jpg" },
  };
  const meta = buildLocationMetadata(location, BASE_URL);
  const og = meta.openGraph as { images?: Array<{ url: string }> };
  assert.equal(og.images?.[0]?.url, "https://hero.jpg");
});

test("buildLocationMetadata: og:image falls back to logo when no hero", () => {
  const location: SeoLocation = {
    ...baseLocation,
    publicProfile: { ...basePublicProfile, heroImageUrl: null, logoUrl: "https://logo.jpg" },
  };
  const meta = buildLocationMetadata(location, BASE_URL);
  const og = meta.openGraph as { images?: Array<{ url: string }> };
  assert.equal(og.images?.[0]?.url, "https://logo.jpg");
});

test("buildLocationMetadata: og:image uses default when neither hero nor logo set", () => {
  const meta = buildLocationMetadata(baseLocation, BASE_URL, "https://default.jpg");
  const og = meta.openGraph as { images?: Array<{ url: string }> };
  assert.equal(og.images?.[0]?.url, "https://default.jpg");
});

test("buildLocationMetadata: no og:images key when nothing set", () => {
  const meta = buildLocationMetadata(baseLocation, BASE_URL);
  const og = meta.openGraph as { images?: unknown };
  assert.equal(og.images, undefined);
});

test("buildLocationMetadata: twitter card is summary_large_image with image", () => {
  const location: SeoLocation = {
    ...baseLocation,
    publicProfile: { ...basePublicProfile, heroImageUrl: "https://hero.jpg" },
  };
  const meta = buildLocationMetadata(location, BASE_URL);
  const twitter = meta.twitter as { card: string };
  assert.equal(twitter.card, "summary_large_image");
});

test("buildLocationMetadata: twitter card is summary without image", () => {
  const meta = buildLocationMetadata(baseLocation, BASE_URL);
  const twitter = meta.twitter as { card: string };
  assert.equal(twitter.card, "summary");
});

// ─── buildLocalBusinessSchema ─────────────────────────────────────────────────

test("buildLocalBusinessSchema: has @context schema.org", () => {
  const schema = buildLocalBusinessSchema(baseLocation, BASE_URL);
  assert.equal(schema["@context"], "https://schema.org");
});

test("buildLocalBusinessSchema: has @type LocalBusiness by default", () => {
  const schema = buildLocalBusinessSchema(baseLocation, BASE_URL);
  assert.equal(schema["@type"], "LocalBusiness");
});

test("buildLocalBusinessSchema: uses valid businessType from allowlist", () => {
  const location: SeoLocation = {
    ...baseLocation,
    publicProfile: { ...basePublicProfile, businessType: "Dentist" },
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  assert.equal(schema["@type"], "Dentist");
});

test("buildLocalBusinessSchema: falls back to LocalBusiness for invalid businessType", () => {
  const location: SeoLocation = {
    ...baseLocation,
    publicProfile: { ...basePublicProfile, businessType: "InvalidType" },
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  assert.equal(schema["@type"], "LocalBusiness");
});

test("buildLocalBusinessSchema: @id ends with #localbusiness", () => {
  const schema = buildLocalBusinessSchema(baseLocation, BASE_URL);
  assert.ok(
    (schema["@id"] as string).endsWith("#localbusiness"),
    `Expected @id to end with #localbusiness, got: ${schema["@id"]}`,
  );
});

test("buildLocalBusinessSchema: url is canonical URL", () => {
  const schema = buildLocalBusinessSchema(baseLocation, BASE_URL);
  assert.equal(schema.url, "https://wehearyou.com/b/acme-dental");
});

test("buildLocalBusinessSchema: omits image when no hero or logo", () => {
  const schema = buildLocalBusinessSchema(baseLocation, BASE_URL);
  assert.equal(schema.image, undefined);
});

test("buildLocalBusinessSchema: includes image when hero set", () => {
  const location: SeoLocation = {
    ...baseLocation,
    publicProfile: { ...basePublicProfile, heroImageUrl: "https://hero.jpg" },
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  assert.equal(schema.image, "https://hero.jpg");
});

test("buildLocalBusinessSchema: includes sameAs when googleMapsUrl set", () => {
  const location: SeoLocation = {
    ...baseLocation,
    publicProfile: { ...basePublicProfile, googleMapsUrl: "https://maps.google.com/acme" },
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  assert.deepEqual(schema.sameAs, ["https://maps.google.com/acme"]);
});

test("buildLocalBusinessSchema: omits sameAs when not set", () => {
  const schema = buildLocalBusinessSchema(baseLocation, BASE_URL);
  assert.equal(schema.sameAs, undefined);
});

test("buildLocalBusinessSchema: includes aggregateRating only when ratingCount > 0", () => {
  const location: SeoLocation = {
    ...baseLocation,
    reviews: [
      {
        source: "GOOGLE",
        status: "PUBLISHED",
        isTestimonial: false,
        isWidgetVisible: false,
        reviewerName: "Jane Doe",
        body: "Excellent service!",
        rating: 5,
      },
    ],
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  assert.ok(schema.aggregateRating !== undefined, "should have aggregateRating");
});

test("buildLocalBusinessSchema: omits aggregateRating when no reviews", () => {
  const schema = buildLocalBusinessSchema(baseLocation, BASE_URL);
  assert.equal(schema.aggregateRating, undefined);
});

test("buildLocalBusinessSchema: review array includes PUBLISHED GOOGLE/FACEBOOK reviews, not PENDING or INTERNAL", () => {
  const location: SeoLocation = {
    ...baseLocation,
    reviews: [
      {
        source: "GOOGLE",
        status: "PUBLISHED",
        isTestimonial: false,
        isWidgetVisible: false,
        reviewerName: "Jane Doe",
        body: "Great!",
        rating: 5,
      },
      {
        source: "GOOGLE",
        status: "PENDING",
        isTestimonial: false,
        isWidgetVisible: false,
        reviewerName: "John Pending",
        body: "Still waiting",
        rating: 3,
      },
      {
        source: "INTERNAL",
        status: "PUBLISHED",
        isTestimonial: false,
        isWidgetVisible: false,
        reviewerName: "Internal User",
        body: "Internal review",
        rating: 4,
      },
    ],
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  const reviews = schema.review as Array<{ author: { name: string } }>;
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].author.name, "Jane Doe");
});

test("buildLocalBusinessSchema: review array includes visible testimonials", () => {
  const location: SeoLocation = {
    ...baseLocation,
    reviews: [
      {
        source: "INTERNAL",
        status: "PUBLISHED",
        isTestimonial: true,
        isWidgetVisible: true,
        reviewerName: "Happy Customer",
        body: "Loved it!",
        rating: 5,
      },
      {
        source: "INTERNAL",
        status: "PUBLISHED",
        isTestimonial: true,
        isWidgetVisible: false,
        reviewerName: "Hidden Customer",
        body: "Not visible",
        rating: 4,
      },
    ],
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  const reviews = schema.review as Array<{ author: { name: string } }>;
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].author.name, "Happy Customer");
});

test("buildLocalBusinessSchema: review array excludes reviews with empty body after sanitization", () => {
  const location: SeoLocation = {
    ...baseLocation,
    reviews: [
      {
        source: "GOOGLE",
        status: "PUBLISHED",
        isTestimonial: false,
        isWidgetVisible: false,
        reviewerName: "Jane Doe",
        body: null,
        rating: 5,
      },
      {
        source: "GOOGLE",
        status: "PUBLISHED",
        isTestimonial: false,
        isWidgetVisible: false,
        reviewerName: "Tag Only",
        body: "<br/>",
        rating: 4,
      },
    ],
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  assert.equal(schema.review, undefined, "review key should be omitted when no reviews pass filter");
});

test("buildLocalBusinessSchema: sanitizes review body (strips HTML)", () => {
  const location: SeoLocation = {
    ...baseLocation,
    reviews: [
      {
        source: "GOOGLE",
        status: "PUBLISHED",
        isTestimonial: false,
        isWidgetVisible: false,
        reviewerName: "Jane Doe",
        body: "<p>Great <b>service</b>!</p>",
        rating: 5,
      },
    ],
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  const reviews = schema.review as Array<{ reviewBody: string }>;
  assert.equal(reviews[0].reviewBody, "Great service!");
});

test("buildLocalBusinessSchema: takes at most 5 reviews", () => {
  const googleReview = (name: string) => ({
    source: "GOOGLE" as const,
    status: "PUBLISHED",
    isTestimonial: false,
    isWidgetVisible: false,
    reviewerName: name,
    body: "Nice!",
    rating: 5,
  });
  const location: SeoLocation = {
    ...baseLocation,
    reviews: [
      googleReview("A"),
      googleReview("B"),
      googleReview("C"),
      googleReview("D"),
      googleReview("E"),
      googleReview("F"),
      googleReview("G"),
    ],
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  const reviews = schema.review as unknown[];
  assert.equal(reviews.length, 5);
});

test("buildLocalBusinessSchema: aggregateRating.ratingValue is a number, not a string", () => {
  const location: SeoLocation = {
    ...baseLocation,
    reviews: [
      {
        source: "GOOGLE",
        status: "PUBLISHED",
        isTestimonial: false,
        isWidgetVisible: false,
        reviewerName: "Jane Doe",
        body: "Great!",
        rating: 5,
      },
    ],
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  const ag = schema.aggregateRating as { ratingValue: unknown };
  assert.equal(typeof ag.ratingValue, "number", "ratingValue should be a number");
});

test("buildLocalBusinessSchema: PENDING testimonial with isWidgetVisible true is excluded", () => {
  const location: SeoLocation = {
    ...baseLocation,
    reviews: [
      {
        source: "INTERNAL",
        status: "PENDING",
        isTestimonial: true,
        isWidgetVisible: true,
        reviewerName: "Pending Customer",
        body: "This is pending!",
        rating: 5,
      },
    ],
  };
  const schema = buildLocalBusinessSchema(location, BASE_URL);
  assert.equal(schema.review, undefined, "PENDING testimonial should not appear in review array");
});

test("buildLocalBusinessSchema: review key is omitted when no reviews pass the filter", () => {
  const schema = buildLocalBusinessSchema(baseLocation, BASE_URL);
  assert.equal(schema.review, undefined, "review key should be absent when reviews array would be empty");
});

test("buildPageDescription: empty-string aiSummary falls through to template", () => {
  const result = buildPageDescription("Acme Dental", "Austin", "TX", 10, 4.5, "");
  assert.ok(result !== "", "should not return empty string");
  assert.ok(result.includes("Acme Dental"), "should use template, not empty aiSummary");
  assert.ok(result.includes("10"), "should include review count from template");
  assert.ok(result.includes("stars"), "should include stars from template");
});
