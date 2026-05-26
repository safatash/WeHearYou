import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildGoogleOAuthUrl, getGoogleConnections, getGoogleOAuthConfig } from "@/lib/google-oauth";
import { GoogleMappingForm } from "./google-mapping-form";

export default async function OnboardingGooglePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const connected = params.connected === "1";
  const error = typeof params.error === "string" ? params.error : undefined;

  const googleConfig = getGoogleOAuthConfig();
  const googleReady = Boolean(googleConfig.clientId && googleConfig.clientSecret && googleConfig.redirectUri);

  const googleOAuthUrl = googleReady
    ? buildGoogleOAuthUrl({
        organizationId: membership.organizationId,
        returnTo: "/onboarding/google",
      })
    : null;

  const location = await prisma.location.findFirst({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, googleLocationName: true },
  });

  if (!location) {
    redirect("/onboarding/location");
  }

  const alreadyMapped = Boolean(location.googleLocationName);

  if (alreadyMapped) {
    redirect("/onboarding/contacts");
  }

  const googleConnections = await getGoogleConnections(membership.organizationId);
  const hasConnection = googleConnections.length > 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 mb-2">Step 2 of 3</p>
      <h2 className="text-[22px] font-bold tracking-tight text-slate-950 mb-1">Connect Google Business</h2>
      <p className="text-sm text-slate-500 mb-7 leading-relaxed">
        Link your Google Business Profile so WeHearYou can sync your reviews and route customers to leave new ones.
      </p>

      {error && (
        <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!hasConnection ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[#4285F4] flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg">
            G
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">Connect with Google</p>
          <p className="text-xs text-slate-500 mb-5">
            You&apos;ll be redirected to sign in and grant access to your Business Profile.
          </p>
          {googleOAuthUrl ? (
            <Link
              href={googleOAuthUrl}
              className="inline-block rounded-2xl bg-[#4285F4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3367D6]"
            >
              Connect Google account →
            </Link>
          ) : (
            <p className="text-xs text-amber-700">Google OAuth is not configured. Contact your administrator.</p>
          )}
          <p className="mt-4 text-xs text-slate-400">
            WeHearYou only reads reviews and business info. We never post on your behalf.
          </p>
        </div>
      ) : (
        <div>
          {connected && (
            <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
              Google account connected! Now select your business location below.
            </div>
          )}
          <p className="text-sm font-semibold text-slate-800 mb-3">
            Select your Google Business location to map to your location:
          </p>
          <GoogleMappingForm
            locationId={location.id}
            googleConnectionId={googleConnections[0].id}
            googleLocations={googleConnections[0].googleLocations}
          />
        </div>
      )}
    </div>
  );
}
