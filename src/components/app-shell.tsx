import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { FlashToast } from "@/components/flash-toast";
import { SignOutButton } from "@/components/sign-out-button";
import { MotivationBlock } from "@/components/motivation-block";
import { getCurrentMembership } from "@/lib/authz";
import { stopImpersonation } from "@/app/admin/actions";
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
  const jar = await cookies();
  const isImpersonating = Boolean(jar.get("why_impersonate")?.value);
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
      <aside className="hidden w-72 flex-col border-r border-slate-700 bg-slate-900 px-5 py-6 lg:flex">
        <div>
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-lg font-bold text-slate-900">
              W
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">WeHearYou</p>
              <h1 className="text-base font-semibold text-white">Reputation OS</h1>
            </div>
          </div>
        </div>

        <nav className="mt-10 space-y-6">
          {/* Group items by their group property */}
          {(() => {
            const grouped = navItems.reduce(
              (acc, item) => {
                const groupName = item.group || "OTHER";
                if (!acc[groupName]) acc[groupName] = [];
                acc[groupName].push(item);
                return acc;
              },
              {} as Record<string, typeof navItems>
            );

            // Maintain order: dashboard first, then groups in order
            const orderedGroups = [
              "REQUESTS & FEEDBACK",
              "FUNNEL SETUP",
              "WEBSITE DISPLAYS",
              "GOOGLE LOCAL SEO",
              "SETTINGS",
            ];

            return (
              <>
                {/* Dashboard - no group */}
                {navItems
                  .filter((item) => !item.group)
                  .map((item) => {
                    const active = item.key === activeScreen;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                          active
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-white hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className={`text-base`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                {/* Grouped items */}
                {orderedGroups.map((groupName) => {
                  const items = grouped[groupName] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={groupName}>
                      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        {groupName}
                      </p>
                      <div className="space-y-1">
                        {items.map((item) => {
                          const active = item.key === activeScreen;
                          if (item.comingSoon) {
                            return (
                              <div
                                key={item.key}
                                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium opacity-40 cursor-not-allowed"
                              >
                                <span className="text-base">{item.icon}</span>
                                <span>{item.label}</span>
                                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider opacity-70">Soon</span>
                              </div>
                            );
                          }
                          return (
                            <Link
                              key={item.key}
                              href={item.href}
                              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                                active
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "text-white hover:bg-slate-800 hover:text-white"
                              }`}
                            >
                              <span className={`text-base`}>
                                {item.icon}
                              </span>
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </nav>

        {/* Motivation Block */}
        <div className="mt-auto pt-6 border-t border-slate-700">
          <MotivationBlock
            title="You're doing great!"
            subtitle="Keep collecting those reviews."
            icon="🏆"
          />
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
            <Link href="/profile" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {initials || "WU"}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500">{userEmail}</p>
              </div>
            </Link>
            <SignOutButton />
          </div>
        </header>

        {isImpersonating && (
          <div className="flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-100 px-4 py-2.5 lg:px-8">
            <p className="text-sm font-semibold text-amber-900">
              👁 Viewing as <span className="text-amber-700">{membership?.user.name ?? membership?.user.email}</span> · {membership?.organization.name}
            </p>
            <form action={stopImpersonation}>
              <button type="submit" className="rounded-xl bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition">
                Exit impersonation
              </button>
            </form>
          </div>
        )}
        <main className="flex-1 px-4 py-6 lg:px-8">
          {flash ? <div className="mb-4"><FlashToast tone={flash.tone} message={flash.message} /></div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
