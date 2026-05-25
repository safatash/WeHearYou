export type YelpReview = {
  externalId: string;
  reviewerName: string;
  rating: number;
  body: string;
  reviewedAt: Date | null;
  sourceReviewUrl: string;
};

export type YelpBusinessInfo = {
  name: string;
  businessId: string;
  avgRating: number | null;
  reviewCount: number;
};

export type YelpScrapeResult = {
  business: YelpBusinessInfo;
  reviews: YelpReview[];
};

export function extractYelpSlug(url: string): string | null {
  const match = url.match(/yelp\.com\/biz\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

function parseJsonLdBlocks(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (typeof parsed === "object" && parsed !== null) {
        results.push(parsed as Record<string, unknown>);
      }
    } catch {
      // skip malformed blocks
    }
  }
  return results;
}

const BUSINESS_TYPES = new Set([
  "LocalBusiness",
  "Restaurant",
  "FoodEstablishment",
  "HealthAndBeautyBusiness",
  "HomeAndConstructionBusiness",
  "LodgingBusiness",
  "Hotel",
  "AutoDealer",
  "AutomotiveBusiness",
  "ProfessionalService",
  "EntertainmentBusiness",
  "SportsActivityLocation",
  "FinancialService",
  "MedicalBusiness",
  "Store",
]);

function isBusinessBlock(block: Record<string, unknown>): boolean {
  const type = block["@type"];
  if (typeof type === "string") return BUSINESS_TYPES.has(type);
  if (Array.isArray(type)) return (type as string[]).some((t) => BUSINESS_TYPES.has(t));
  return false;
}

export async function scrapeYelpBusiness(yelpUrl: string): Promise<YelpScrapeResult> {
  const slug = extractYelpSlug(yelpUrl);
  if (!slug) {
    throw new Error("Invalid Yelp business URL. Expected format: https://www.yelp.com/biz/your-business-name");
  }

  const normalized = `https://www.yelp.com/biz/${slug}`;

  const res = await fetch(normalized, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error(`Yelp business not found at ${normalized}. Check the URL and try again.`);
  }
  if (!res.ok) {
    throw new Error(`Yelp returned HTTP ${res.status}. The page may be temporarily unavailable.`);
  }

  const html = await res.text();
  const blocks = parseJsonLdBlocks(html);
  const bizBlock = blocks.find(isBusinessBlock);

  if (!bizBlock) {
    throw new Error(
      "Could not find business data on this Yelp page. Make sure the URL points to a Yelp business listing (e.g. https://www.yelp.com/biz/your-business)."
    );
  }

  const name = typeof bizBlock["name"] === "string" ? bizBlock["name"] : slug;

  const aggRating = bizBlock["aggregateRating"] as Record<string, unknown> | undefined;
  const avgRating =
    aggRating && typeof aggRating["ratingValue"] !== "undefined"
      ? parseFloat(String(aggRating["ratingValue"]))
      : null;
  const reviewCount =
    aggRating && typeof aggRating["reviewCount"] !== "undefined"
      ? parseInt(String(aggRating["reviewCount"]), 10)
      : 0;

  const rawReviews = Array.isArray(bizBlock["review"])
    ? (bizBlock["review"] as Record<string, unknown>[])
    : [];

  const reviews: YelpReview[] = rawReviews.map((r) => {
    const authorRaw = r["author"];
    const authorName =
      typeof authorRaw === "string"
        ? authorRaw
        : typeof authorRaw === "object" && authorRaw !== null && typeof (authorRaw as Record<string, unknown>)["name"] === "string"
        ? (authorRaw as Record<string, unknown>)["name"] as string
        : "Anonymous";

    const datePublished = typeof r["datePublished"] === "string" ? r["datePublished"] : "";

    const ratingBlock = r["reviewRating"] as Record<string, unknown> | undefined;
    const ratingValue = ratingBlock ? parseInt(String(ratingBlock["ratingValue"] ?? "5"), 10) : 5;
    const rating = Math.max(1, Math.min(5, isNaN(ratingValue) ? 5 : ratingValue));

    const body =
      typeof r["reviewBody"] === "string"
        ? r["reviewBody"]
        : typeof r["description"] === "string"
        ? r["description"]
        : "";

    const externalId = `yelp-${slug}-${Buffer.from(authorName + datePublished).toString("base64").slice(0, 32)}`;

    return {
      externalId,
      reviewerName: authorName,
      rating,
      body,
      reviewedAt: datePublished ? new Date(datePublished) : null,
      sourceReviewUrl: normalized,
    };
  });

  return {
    business: { name, businessId: slug, avgRating, reviewCount },
    reviews,
  };
}
