"use server";

import { ContactSource, PreferredChannel } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireContactManagement } from "@/lib/authz";
import { getCurrentAccessibleLocationIds } from "@/lib/current-scope";

export async function importContacts(formData: FormData): Promise<{ imported: number; duplicates: number; skipped: number }> {
  const locationId = normalize(formData.get("locationId"));
  const contactsRaw = formData.get("contacts");
  const allowedLocationIds = await getCurrentAccessibleLocationIds();

  if (!locationId) throw new Error("Location is required.");
  if (!contactsRaw || typeof contactsRaw !== "string") throw new Error("No contacts provided.");

  await requireContactManagement(locationId);

  const location = await prisma.location.findFirst({
    where: {
      AND: [
        { id: locationId },
        ...(allowedLocationIds.length > 0 ? [{ id: { in: allowedLocationIds } }] : []),
      ],
    },
    select: { id: true },
  });

  if (!location) throw new Error("Location not found.");

  const rows: Array<{ name: string | null; email: string | null; phone: string | null }> = JSON.parse(contactsRaw);
  const validRows = rows.filter((r) => r.name || r.email || r.phone);
  const skipped = rows.length - validRows.length;

  if (validRows.length === 0) return { imported: 0, duplicates: 0, skipped };

  const emails = validRows.map((r) => r.email).filter((e): e is string => !!e);
  const phones = validRows.map((r) => r.phone).filter((p): p is string => !!p);

  const existingContacts =
    emails.length > 0 || phones.length > 0
      ? await prisma.contact.findMany({
          where: {
            locationId,
            OR: [
              ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
              ...(phones.length > 0 ? [{ phone: { in: phones } }] : []),
            ],
          },
          select: { email: true, phone: true },
        })
      : [];

  const existingEmails = new Set(existingContacts.map((c) => c.email).filter(Boolean));
  const existingPhones = new Set(existingContacts.map((c) => c.phone).filter(Boolean));

  const toCreate: Array<{
    locationId: string;
    name: string;
    email: string | null;
    phone: string | null;
    source: ContactSource;
    preferredChannel: PreferredChannel;
  }> = [];
  let duplicates = 0;

  for (const row of validRows) {
    if ((row.email && existingEmails.has(row.email)) || (row.phone && existingPhones.has(row.phone))) {
      duplicates++;
      continue;
    }
    toCreate.push({
      locationId,
      name: row.name || row.email || row.phone || "Unnamed Contact",
      email: row.email ?? null,
      phone: row.phone ?? null,
      source: ContactSource.CSV_IMPORT,
      preferredChannel: row.email ? PreferredChannel.EMAIL : PreferredChannel.SMS,
    });
  }

  if (toCreate.length > 0) {
    await prisma.contact.createMany({ data: toCreate });
  }

  return { imported: toCreate.length, duplicates, skipped };
}

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
