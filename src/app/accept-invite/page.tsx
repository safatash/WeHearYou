export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AcceptInviteForm, AcceptExistingInviteForm } from "@/app/accept-invite/setup-form";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : null;

  if (!token) {
    notFound();
  }

  const membership = await prisma.userMembership.findFirst({
    where: {
      inviteToken: token,
      status: "INVITED",
    },
    include: {
      user: true,
      organization: true,
      locationAccess: {
        include: {
          location: true,
        },
      },
    },
  });

  if (!membership) {
    notFound();
  }

  // Existing accounts already have a password — accepting only adds this access,
  // so skip the password-setup step entirely.
  const hasAccount = Boolean(membership.user.passwordHash);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou Invite</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{hasAccount ? "Accept invitation" : "Set your password"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You&apos;ve been invited to join <span className="font-semibold text-slate-900">{membership.organization.name}</span> as <span className="font-semibold text-slate-900">{membership.role}</span>.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p><span className="font-semibold text-slate-900">Name:</span> {membership.user.name}</p>
          <p className="mt-2"><span className="font-semibold text-slate-900">Email:</span> {membership.user.email}</p>
          <p className="mt-2"><span className="font-semibold text-slate-900">Locations:</span> {membership.locationAccess.map((entry) => entry.location.name).join(", ") || "All organization locations"}</p>
        </div>

        <div className="mt-8">
          {hasAccount ? (
            <AcceptExistingInviteForm inviteToken={token} email={membership.user.email} />
          ) : (
            <AcceptInviteForm inviteToken={token} />
          )}
        </div>
      </div>
    </main>
  );
}
