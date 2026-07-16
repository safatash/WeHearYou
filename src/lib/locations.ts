import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatRelativeSyncTime } from "./relative-time";
import { buildGoogleMappingHealth } from "./google-mapping";

export { formatRelativeSyncTime };

export function buildGoogleWriteReviewLink(googlePlaceId: string | null | undefined) {
  const normalizedPlaceId = typeof googlePlaceId === "string" ? googlePlaceId.trim() : "";

  if (!normalizedPlaceId) {
    return null;
  }

  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(normalizedPlaceId)}`;
}

const locationInclude = {
  publicProfile: true,
  googleConnection: true,
  facebookPage: true,
  contacts: {
    orderBy: {
      createdAt: "asc",
    },
  },
  campaigns: {
    include: {
      recipients: {
        include: {
          contact: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  reviews: true,
} satisfies Prisma.LocationInclude;

export type LocationWithRelations = Prisma.LocationGetPayload<{
  include: typeof locationInclude;
}>;

export async function getLocations(locationIds?: string[]) {
  const locations = await prisma.location.findMany({
    where: locationIds ? { id: { in: locationIds } } : undefined,
    include: locationInclude,
    orderBy: [{ createdAt: "asc" }],
  });

  return locations.map((location) => ({
    ...location,
    googleMappingHealth: buildGoogleMappingHealth({
      googleLocationName: location.googleLocationName,
      googlePlaceId: location.googlePlaceId,
    }),
  }));
}

export async function getLocationById(id: string, locationIds?: string[]) {
  const location = await prisma.location.findFirst({
    where: {
      id,
      ...(locationIds && locationIds.length > 0 ? { id: { in: locationIds } } : {}),
    },
    include: locationInclude,
  });

  if (!location) {
    return null;
  }

  const googleReviewCount = await prisma.review.count({
    where: {
      locationId: id,
      source: "GOOGLE",
    },
  });

  return {
    ...location,
    googleReviewCount,
    googleMappingHealth: buildGoogleMappingHealth({
      googleLocationName: location.googleLocationName,
      googlePlaceId: location.googlePlaceId,
    }),
  };
}

export async function getLocationMappingOptions(locationId: string) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!location) {
    return [];
  }

  const connections = await prisma.googleAccountConnection.findMany({
    where: {
      organizationId: location.organizationId,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const { fetchGoogleBusinessLocations, getValidGoogleAccessToken } = await import("@/lib/google-oauth");

  const mapped = await Promise.all(
    connections.map(async (connection) => {
      try {
        const accessToken = await getValidGoogleAccessToken({
          id: connection.id,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt: connection.expiresAt,
          scope: connection.scope,
          tokenType: connection.tokenType,
        });
        const googleLocations = await fetchGoogleBusinessLocations(accessToken);
        return {
          connection,
          googleLocations,
          fetchError: null,
        };
      } catch (error) {
        return {
          connection,
          googleLocations: [],
          fetchError: error instanceof Error ? error.message : "Failed to fetch Google locations",
        };
      }
    }),
  );

  return mapped;
}

export function formatLocationStatus(status: string) {
  return status;
}

export function getLocationPortfolioStats(locations: LocationWithRelations[]) {
  const totalLocations = locations.length;
  const activeLocations = locations.filter((location) => location.status === "Active").length;
  const totalContacts = locations.reduce((sum, location) => sum + location.contacts.length, 0);

  const ratedLocations = locations.filter((location) => typeof location.avgRating === "number");
  const portfolioRatingValue = ratedLocations.length
    ? ratedLocations.reduce((sum, location) => sum + (location.avgRating ?? 0), 0) / ratedLocations.length
    : 0;
  const portfolioRating = portfolioRatingValue.toFixed(1);

  const totalReviews = locations.reduce((sum, location) => sum + location.reviews.length, 0);
  const totalPending = locations.reduce(
    (sum, location) => sum + location.reviews.filter((review) => !review.replyPublishedAt && !review.replySentAt).length,
    0,
  );

  return {
    totalLocations,
    activeLocations,
    launchingLocations: totalLocations - activeLocations,
    totalContacts,
    totalReviews,
    totalPending,
    portfolioRatingValue,
    portfolioRating: `${portfolioRating} ★`,
  };
}
