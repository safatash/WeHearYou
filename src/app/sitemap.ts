import type { MetadataRoute } from "next";
import { buildCanonicalUrl, isPublicProfileIndexable } from "@/lib/seo";

const baseUrl = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app"
).replace(/\/$/, "");

function fallbackSitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fallback = fallbackSitemap();

  if (!process.env.DATABASE_URL) {
    return fallback;
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const locations = await prisma.location.findMany({
      where: {
        publicProfile: { schemaEnabled: true },
        slug: { not: "" },
        name: { not: "" },
      },
      select: {
        slug: true,
        name: true,
        updatedAt: true,
        publicProfile: { select: { schemaEnabled: true } },
      },
    });

    const profileEntries = locations
      .filter((loc) =>
        isPublicProfileIndexable({
          name: loc.name,
          slug: loc.slug,
          publicProfile: loc.publicProfile,
        })
      )
      .map((loc) => ({
        url: buildCanonicalUrl(baseUrl, loc.slug),
        lastModified: loc.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    return [...fallback, ...profileEntries];
  } catch (error) {
    console.error(
      "[sitemap] Falling back to static sitemap because dynamic generation failed.",
      error
    );
    return fallback;
  }
}
