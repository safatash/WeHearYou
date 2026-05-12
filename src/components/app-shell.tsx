import Link from "next/link";
import { auth } from "@/auth";
import { FlashToast } from "@/components/flash-toast";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentMembership } from "@/lib/authz";
import { navItems, type ScreenKey } from "@/lib/navigation";

export async function AppShell({
  children,
  activeScreen,
  flash,
}: {
  children: React.ReactNode;
  activeScreen: ScreenKey;
  flash?: { tone?: "success" | "error" | "info"; message: string } | null;
}) {
  const [session, membership] = await Promise.all([auth(), getCurrentMembership()]);
  const userName = membership?.user.name ?? session?.user?.name ?? "Unknown User";
  const userEmail = membership?.user.email ?? session?.user?.email ?? "No email";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-72 flex-col border-r border-slate-200/80 bg-white/90 px-5 py-6 backdrop-blur lg:flex">
        <div>
          <div className="flex items-center gap-3 rounded-[24px] bg-gradient-to-br from-indigo-50 to-white px-4 py-4 shadow-sm ring-1 ring-indigo-100">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-semibold text-white">
              W
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">WeHearYou</p>
              <h1 className="text-lg font-semibold text-slate-950">Reputation OS</h1>
            </div>
          </div>
          <p className="mt-5 px-1 text-sm leading-6 text-slate-500">
            This prototype is shaped around the plugin logic, tokenized funnel flow, request campaigns, and automation rules you already built.
          </p>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const active = item.key === activeScreen;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <span className={`text-base ${active ? "text-white" : "text-current"}`}>{item.icon}</span>
                <span className={active ? "text-white" : "text-current"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Product Direction</p>
          <p className="mt-2 text-sm text-slate-600">
            Standalone SaaS evolution of ReviewRamp, keeping the useful parts, dropping the rough edges, and presenting the better product version.
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
              Search contacts, invite tokens, reviews, workflows...
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
              Notifications
            </button>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {initials || "WU"}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500">{userEmail}</p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          {flash ? <div className="mb-4"><FlashToast tone={flash.tone} message={flash.message} /></div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
