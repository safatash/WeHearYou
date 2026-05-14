import { prisma } from "@/lib/prisma";

export async function getSettingsData(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    include: {
      locations: {
        include: {
          publicProfile: true,
        },
        orderBy: [{ createdAt: "asc" }],
      },
      googleConnections: true,
      automations: true,
      users: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!organization) {
    return null;
  }

  const profiles = organization.locations.map((location) => location.publicProfile).filter(Boolean);
  const firstProfile = profiles[0] ?? null;

  return {
    organization,
    defaults: {
      defaultReviewLink: organization.locations.find((location) => location.reviewLink)?.reviewLink ?? "",
      bookingUrl: firstProfile?.bookingUrl ?? "",
      ctaLabel: firstProfile?.ctaLabel ?? "",
      ctaUrl: firstProfile?.ctaUrl ?? "",
      theme: firstProfile?.theme ?? "light",
    },
    stats: {
      locations: organization.locations.length,
      googleConnections: organization.googleConnections.length,
      activeAutomations: organization.automations.filter((automation) => automation.isActive).length,
      activeUsers: organization.users.filter((membership) => membership.status === "ACTIVE").length,
    },
  };
}
