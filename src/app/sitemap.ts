import type { MetadataRoute } from "next";
import { buildCanonicalUrl, isPublicProfileIndexable } from "@/lib/seo";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wehearyou.vercel.app";

  const locations = await prisma.location.findMany({
    where: {
      publicProfile: {
        schemaEnabled: true,
      },
      slug: {
        not: "",
      },
      name: {
        not: "",
      },
    },
    select: {
      slug: true,
      name: true,
      updatedAt: true,
      publicProfile: {
        select: {
          schemaEnabled: true,
        },
      },
    },
  });

  const sitemapEntries = locations
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

  return sitemapEntries;
}
