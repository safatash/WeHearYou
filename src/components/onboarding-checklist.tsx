import Link from "next/link";
import { dismissOnboarding } from "@/app/onboarding/actions";

type Props = {
  hasLocation: boolean;
  hasGoogle: boolean;
  hasContacts: boolean;
  canDismiss: boolean;
};

export function OnboardingChecklist({ hasLocation, hasGoogle, hasContacts, canDismiss }: Props) {
  const doneCount = [hasLocation, hasGoogle, hasContacts].filter(Boolean).length;
  const pct = Math.round((doneCount / 3) * 100);
  const subtitle =
    doneCount === 0
      ? "Complete these steps to start collecting reviews"
      : doneCount === 1
        ? "1 step done — keep going!"
        : "2 steps done — almost there!";

  const items = [
    {
      done: hasLocation,
      title: "Add your first location",
      desc: "Set up a location to start your review funnel",
      cta: "Set up →",
      href: "/onboarding/location",
    },
    {
      done: hasGoogle,
      title: "Connect Google Business",
      desc: "Sync reviews and route customers to your listing",
      cta: "Connect →",
      href: "/onboarding/google",
    },
    {
      done: hasContacts,
      title: "Add your first contacts",
      desc: "Import customers to start sending review requests",
      cta: "Add contacts →",
      href: "/onboarding/contacts",
    },
  ];

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[15px] font-bold text-slate-950">Finish setting up WeHearYou</p>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-[13px] font-bold text-indigo-600">{doneCount} / 3</span>
      </div>

      <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.title}
            className={`flex items-center gap-3.5 rounded-2xl border p-3.5 ${
              item.done
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div
              className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                item.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300"
              }`}
            >
              {item.done ? "✓" : ""}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold ${
                  item.done ? "line-through text-slate-400" : "text-slate-900"
                }`}
              >
                {item.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </div>
            {!item.done && (
              <Link
                href={item.href}
                className="text-xs font-semibold text-indigo-600 whitespace-nowrap hover:text-indigo-700"
              >
                {item.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      {canDismiss && (
        <form action={dismissOnboarding} className="mt-4">
          <button
            type="submit"
            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            Dismiss
          </button>
        </form>
      )}
    </div>
  );
}
