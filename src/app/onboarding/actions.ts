"use server";

import { ContactSource, PreferredChannel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTeamManagement, requireLocationAccess, requireContactManagement } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

function normalize(value: FormDataEntryValue | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function createUniqueSlug(organizationId: string, name: string) {
  const base = slugify(name) || "location";
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.location.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function dismissOnboarding() {
  const membership = await requireTeamManagement();
  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: { onboardingDismissedAt: new Date() },
  });
  revalidatePath("/");
}

export async function createLocationForOnboarding(formData: FormData) {
  const membership = await requireTeamManagement();
  const name = normalize(formData.get("name"));
  const city = normalize(formData.get("city"));
  const state = normalize(formData.get("state"));
  const addressLine1 = normalize(formData.get("addressLine1"));

  if (!name || !city || !state) {
    redirect("/onboarding/location?error=" + encodeURIComponent("Name, city, and state are required."));
  }

  const slug = await createUniqueSlug(membership.organizationId, name);

  const location = await prisma.location.create({
    data: {
      organizationId: membership.organizationId,
      name,
      slug,
      city,
      state,
      status: "Launching",
      publicProfile: {
        create: {
          addressLine1,
          showReviews: true,
          showTestimonials: true,
          showMap: true,
          showHours: false,
          schemaEnabled: true,
        },
      },
    },
    select: { id: true },
  });

  revalidatePath("/");
  revalidatePath("/locations");
  redirect("/onboarding/google");
}

export async function createContactForOnboarding(formData: FormData) {
  const allowedLocationIds = await getCurrentAccessibleLocationIds();

  if (allowedLocationIds.length === 0) {
    redirect("/onboarding/contacts?error=" + encodeURIComponent("No location found. Complete step 1 first."));
  }

  const locationId = allowedLocationIds[0];
  await requireContactManagement(locationId);
  const firstName = normalize(formData.get("firstName"));
  const lastName = normalize(formData.get("lastName"));
  const email = normalize(formData.get("email"));
  const phone = normalize(formData.get("phone"));

  if (!firstName && !lastName && !email && !phone) {
    redirect("/onboarding/contacts?error=" + encodeURIComponent("Add at least a name, email, or phone number."));
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const name = fullName || email || phone || "Unnamed Contact";

  await prisma.contact.create({
    data: {
      locationId,
      firstName,
      lastName,
      name,
      email,
      phone,
      source: ContactSource.MANUAL,
      preferredChannel: PreferredChannel.SMS,
    },
  });

  revalidatePath("/");
  redirect("/?onboarding=done");
}

export async function mapLocationToGoogleForOnboarding(formData: FormData) {
  const locationId = String(formData.get("locationId") ?? "").trim();
  const googleConnectionId = String(formData.get("googleConnectionId") ?? "").trim();
  const googleLocationPayload = String(formData.get("googleLocationPayload") ?? "").trim();

  if (!locationId || !googleConnectionId || !googleLocationPayload) {
    redirect("/onboarding/google?error=" + encodeURIComponent("Select a Google Business location to continue."));
  }

  const membership = await requireLocationAccess(locationId);

  const connection = await prisma.googleAccountConnection.findFirst({
    where: { id: googleConnectionId, organizationId: membership.organizationId },
    select: { id: true },
  });

  if (!connection) {
    redirect("/onboarding/google?error=" + encodeURIComponent("Google connection not found."));
  }

  let parsed: {
    googleLocationId: string;
    googleLocationName: string;
    googlePlaceId?: string;
    reviewLink?: string;
    mapsUri?: string;
  };
  try {
    parsed = JSON.parse(googleLocationPayload);
  } catch {
    redirect("/onboarding/google?error=" + encodeURIComponent("Invalid location data. Please try again."));
  }

  await prisma.location.update({
    where: { id: locationId },
    data: {
      googleConnectionId,
      googleLocationId: parsed.googleLocationId,
      googlePlaceId: parsed.googlePlaceId || null,
      googleLocationName: parsed.googleLocationName,
      googleConnectedAt: new Date(),
      reviewLink: parsed.reviewLink || null,
      publicProfile: {
        upsert: {
          update: { googleMapsUrl: parsed.mapsUri || null },
          create: { googleMapsUrl: parsed.mapsUri || null },
        },
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/integrations");
  redirect("/onboarding/contacts");
}
