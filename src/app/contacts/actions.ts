"use server";

import { ContactSource, PreferredChannel } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireContactManagement } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

function normalize(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function getPreferredChannel(values: FormDataEntryValue[]) {
  const normalized = values
    .map((value) => (typeof value === "string" ? value.trim().toUpperCase() : ""))
    .filter(Boolean);

  return normalized.includes("EMAIL") ? PreferredChannel.EMAIL : PreferredChannel.SMS;
}

async function getTagIds(tagsRaw: string | null) {
  const tagNames = (tagsRaw ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const tags = await Promise.all(
    tagNames.map((tagName) =>
      prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName },
        select: { id: true },
      })
    )
  );

  return tags.map((tag) => tag.id);
}

async function validateLocation(locationId: string | null, allowedLocationIds?: string[]) {
  if (!locationId) {
    throw new Error("Location is required.");
  }

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      ...(allowedLocationIds && allowedLocationIds.length > 0 ? { id: { in: allowedLocationIds } } : {}),
    },
    select: { id: true },
  });

  if (!location) {
    throw new Error("Selected location was not found.");
  }

  return location.id;
}

async function getContactLocationId(contactId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { locationId: true },
  });

  if (!contact) {
    throw new Error("Contact not found.");
  }

  return contact.locationId;
}

function buildName(firstName: string | null, lastName: string | null, email: string | null, phone: string | null) {
  if (!firstName && !lastName && !email && !phone) {
    throw new Error("Add at least a name, email, or phone.");
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || email || phone || "Unnamed Contact";
}

export async function createContact(formData: FormData) {
  const firstName = normalize(formData.get("firstName"));
  const lastName = normalize(formData.get("lastName"));
  const email = normalize(formData.get("email"));
  const phone = normalize(formData.get("phone"));
  const notes = normalize(formData.get("notes"));
  const allowedLocationIds = await getCurrentAccessibleLocationIds();
  const locationId = await validateLocation(normalize(formData.get("locationId")), allowedLocationIds);
  const preferredChannel = getPreferredChannel(formData.getAll("preferredChannel"));
  const tagIds = await getTagIds(normalize(formData.get("tags")));
  const name = buildName(firstName, lastName, email, phone);

  await requireContactManagement(locationId);

  const createdContact = await prisma.contact.create({
    data: {
      locationId,
      firstName,
      lastName,
      name,
      email,
      phone,
      notes,
      source: ContactSource.MANUAL,
      preferredChannel,
      tags: tagIds.length
        ? {
            create: tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    select: {
      id: true,
    },
  });

  redirect(`/contacts/${createdContact.id}`);
}

export async function updateContact(formData: FormData) {
  const contactId = normalize(formData.get("contactId"));
  const firstName = normalize(formData.get("firstName"));
  const lastName = normalize(formData.get("lastName"));
  const email = normalize(formData.get("email"));
  const phone = normalize(formData.get("phone"));
  const notes = normalize(formData.get("notes"));
  const allowedLocationIds = await getCurrentAccessibleLocationIds();
  const locationId = await validateLocation(normalize(formData.get("locationId")), allowedLocationIds);
  const preferredChannel = getPreferredChannel(formData.getAll("preferredChannel"));
  const tagIds = await getTagIds(normalize(formData.get("tags")));
  const name = buildName(firstName, lastName, email, phone);

  if (!contactId) {
    throw new Error("Contact ID is required.");
  }

  const existingLocationId = await getContactLocationId(contactId);
  await requireContactManagement(existingLocationId);
  await requireContactManagement(locationId);

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      locationId,
      firstName,
      lastName,
      name,
      email,
      phone,
      notes,
      preferredChannel,
      tags: {
        deleteMany: {},
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
  });

  redirect(`/contacts/${contactId}`);
}
