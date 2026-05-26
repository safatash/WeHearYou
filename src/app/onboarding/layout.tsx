import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { skipOnboarding } from "@/app/onboarding/actions";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
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
  const hasGoogle = (org?.locations[0]?.googleLocationName ?? null) !== null;

  const contactCount = hasLocation
    ? await prisma.contact.count({
        where: { locationId: org!.locations[0].id },
      })
    : 0;
  const hasContacts = contactCount > 0;

  const steps = [
    { label: "Location", done: hasLocation },
    { label: "Google", done: hasGoogle },
    { label: "Contacts", done: hasContacts },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <span className="text-[15px] font-bold tracking-tight text-slate-950">WeHearYou</span>
        <form action={skipOnboarding}>
          <button type="submit" className="text-[13px] font-medium text-slate-500 hover:text-slate-900">
            Skip for now →
          </button>
        </form>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-10">
        <div className="flex items-center gap-0 mb-10">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    step.done
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    step.done ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    step.done ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
