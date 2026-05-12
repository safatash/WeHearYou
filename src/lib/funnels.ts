import { prisma } from "@/lib/prisma";

export async function getFunnelBuilderData(selectedLocationId?: string | null) {
  const locations = await prisma.location.findMany({
    include: {
      publicProfile: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const selectedLocation =
    locations.find((location) => location.id === selectedLocationId || location.slug === selectedLocationId) ?? locations[0] ?? null;
  const profile = selectedLocation?.publicProfile ?? null;

  return {
    locations,
    selectedLocation,
    profile,
  };
}

export async function getFunnelPreviewData(selectedLocationId?: string | null) {
  const locations = await prisma.location.findMany({
    include: {
      publicProfile: true,
      reviews: {
        where: {
          isWidgetVisible: true,
        },
        orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
        take: 3,
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const selectedLocation =
    locations.find((location) => location.id === selectedLocationId || location.slug === selectedLocationId) ?? locations[0] ?? null;
  const profile = selectedLocation?.publicProfile ?? null;

  return {
    locations,
    selectedLocation,
    profile,
    previewSteps: [
      {
        id: "rating",
        title: profile?.headline || `How was your experience at ${selectedLocation?.name ?? "this location"}?`,
        detail: profile?.subheadline || "Collect a 1 to 5 star rating, then route the visitor based on sentiment.",
      },
      {
        id: "promoter",
        title: `4 to 5 stars: redirect to ${selectedLocation?.reviewLink ? "Google review" : "public review destination"}`,
        detail: selectedLocation?.reviewLink
          ? `Happy customers are sent to ${selectedLocation.reviewLink}.`
          : "Happy customers are routed to your public review destination when configured.",
      },
      {
        id: "detractor",
        title: "1 to 3 stars: collect private feedback",
        detail: "Lower ratings stay in the funnel so the team can follow up before a public review is requested.",
      },
    ],
  };
}
