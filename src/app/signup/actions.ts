"use server";

import bcrypt from "bcryptjs";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type SignUpState = {
  error?: string;
};

function normalize(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "organization";
}

async function createUniqueOrganizationSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let index = 2;

  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signUp(_prevState: SignUpState, formData: FormData): Promise<SignUpState> {
  const name = normalize(formData.get("name"));
  const email = normalize(formData.get("email"))?.toLowerCase();
  const organizationName = normalize(formData.get("organizationName"));
  const website = normalize(formData.get("website"));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !organizationName) {
    return { error: "Name, email, and organization name are required." };
  }

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "An account already exists for this email. Please sign in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = await createUniqueOrganizationSlug(organizationName);

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
        website,
      },
    });

    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: new Date(),
      },
    });

    await tx.userMembership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
        accessScope: "All locations",
      },
    });
  });

  redirect("/login?flash=Account+created.+You+can+sign+in+now.&tone=success");
}
