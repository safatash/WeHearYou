import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      locations: {
        select: { id: true, googleLocationName: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { locations: true } },
    },
  });

  const hasLocation = (org?._count.locations ?? 0) > 0;

  if (!hasLocation) {
    redirect("/onboarding/location");
  }

  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;

  if (!hasGoogle) {
    redirect("/onboarding/google");
  }

  const contactCount = await prisma.contact.count({
    where: { locationId: org!.locations[0].id },
  });

  if (contactCount === 0) {
    redirect("/onboarding/contacts");
  }

  redirect("/");
}
