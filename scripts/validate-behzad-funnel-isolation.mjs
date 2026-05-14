import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { email: "safatash@gmail.com" },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          organization: {
            include: {
              locations: {
                orderBy: { createdAt: "asc" },
                include: { publicProfile: true, googleConnection: true },
              },
              googleConnections: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("Behzad user was not found.");
  }

  if (user.memberships.length !== 1) {
    throw new Error(`Expected exactly one active membership for Behzad, found ${user.memberships.length}.`);
  }

  const membership = user.memberships[0];
  const org = membership.organization;
  const locationIds = org.locations.map((location) => location.id);

  const scopedBuilderLocations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
    include: { publicProfile: true },
    orderBy: [{ createdAt: "asc" }],
  });

  const scopedPreviewLocations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
    include: {
      publicProfile: true,
      reviews: {
        where: { isWidgetVisible: true },
        orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
        take: 3,
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const leakedBuilderLocations = scopedBuilderLocations.filter((location) => location.organizationId !== org.id);
  const leakedPreviewLocations = scopedPreviewLocations.filter((location) => location.organizationId !== org.id);
  const crossOrgMappedLocations = org.locations.filter(
    (location) => location.googleConnection && location.googleConnection.organizationId !== org.id,
  );
  const foreignOrganizationGoogleConnections = org.googleConnections.filter((connection) => connection.organizationId !== org.id);

  const result = {
    user: { id: user.id, name: user.name, email: user.email },
    activeMembership: { id: membership.id, role: membership.role, status: membership.status, organizationId: org.id },
    organization: { id: org.id, name: org.name, slug: org.slug },
    accessibleLocationIds: locationIds,
    scopedBuilderLocations: scopedBuilderLocations.map((location) => ({
      id: location.id,
      name: location.name,
      slug: location.slug,
      organizationId: location.organizationId,
    })),
    scopedPreviewLocations: scopedPreviewLocations.map((location) => ({
      id: location.id,
      name: location.name,
      slug: location.slug,
      organizationId: location.organizationId,
      visibleReviewCountLoaded: location.reviews.length,
    })),
    organizationGoogleConnections: org.googleConnections.map((connection) => ({
      id: connection.id,
      email: connection.googleEmail,
      organizationId: connection.organizationId,
    })),
    crossOrgMappedLocations: crossOrgMappedLocations.map((location) => ({
      id: location.id,
      name: location.name,
      organizationId: location.organizationId,
      googleConnectionId: location.googleConnectionId,
      googleConnectionOrganizationId: location.googleConnection?.organizationId,
    })),
    assertions: {
      singleActiveMembership: user.memberships.length === 1,
      activeOrganizationIsNovaMedMarket: org.name === "NOVA MedMarket",
      scopedBuilderHasNoForeignLocations: leakedBuilderLocations.length === 0,
      scopedPreviewHasNoForeignLocations: leakedPreviewLocations.length === 0,
      noForeignOrganizationGoogleConnections: foreignOrganizationGoogleConnections.length === 0,
      noCrossOrgMappedLocations: crossOrgMappedLocations.length === 0,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  const failed = Object.entries(result.assertions).filter(([, passed]) => !passed);
  if (failed.length > 0) {
    throw new Error(`Validation failed: ${failed.map(([name]) => name).join(", ")}`);
  }
} finally {
  await prisma.$disconnect();
}
