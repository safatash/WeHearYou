import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { FlashToast } from "@/components/flash-toast";
import { SignOutButton } from "@/components/sign-out-button";
import { MotivationBlock } from "@/components/motivation-block";
import { getCurrentMembership } from "@/lib/authz";
import { stopImpersonation } from "@/app/admin/actions";
import { navItems, type ScreenKey } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";
import { LocationSwitcher } from "@/components/location-switcher";
import { UserDropdown } from "@/components/user-dropdown";

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

  // Fetch locations for the switcher
  const locations = membership
    ? await prisma.location.findMany({
        where: { organizationId: membership.organizationId },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex sticky top-0 h-screen overflow-y-auto">
        <div>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-decoration-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white">
              W
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.05em] text-slate-500">WeHearYou</p>
              <h1 className="text-sm font-semibold text-slate-900">Reputation</h1>
            </div>
          </Link>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-6">
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

            const orderedGroups = [
              "REQUESTS & FEEDBACK",
              "FUNNEL SETUP",
              "WEBSITE DISPLAYS",
              "GOOGLE LOCAL SEO",
              "SETTINGS",
            ];

            return (
              <>
                {/* Dashboard */}
                {navItems
                  .filter((item) => !item.group)
                  .map((item) => {
                    const active = item.key === activeScreen;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                {/* Groups */}
                {orderedGroups.map((groupName) => {
                  const items = grouped[groupName] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={groupName}>
                      <p className="px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] text-slate-400">
                        {groupName}
                      </p>
                      <div className="space-y-1">
                        {items.map((item) => {
                          const active = item.key === activeScreen;
                          if (item.comingSoon) {
                            return (
                              <div
                                key={item.key}
                                className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 opacity-50 cursor-not-allowed"
                              >
                                <span className="text-base">{item.icon}</span>
                                <span>{item.label}</span>
                                <span className="ml-auto text-[10px] font-bold uppercase">Soon</span>
                              </div>
                            );
                          }
                          return (
                            <Link
                              key={item.key}
                              href={item.href}
                              className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                active
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span className="text-base">{item.icon}</span>
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

        {/* Motivation block */}
        <div className="mt-auto border-t border-slate-200 pt-6">
          <MotivationBlock
            title="You're doing great!"
            subtitle="Keep collecting those reviews."
            icon="🏆"
          />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-1 items-center gap-4">
            <input
              type="text"
              placeholder="Search..."
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 placeholder-slate-400 focus:border-indigo-300 focus:outline-none w-64"
            />
          </div>

          <div className="flex items-center gap-3">
            <LocationSwitcher locations={locations} />

            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              🔔
            </button>

            <UserDropdown userName={userName} userEmail={userEmail} />
          </div>
        </header>

        {/* Impersonation banner */}
        {isImpersonating && (
          <div className="flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-100 px-4 py-2.5 lg:px-8">
            <p className="text-sm font-semibold text-amber-900">
              👁 Viewing as <span className="text-amber-700">{membership?.user.name ?? membership?.user.email}</span> · {membership?.organization.name}
            </p>
            <form action={stopImpersonation}>
              <button type="submit" className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition">
                Exit impersonation
              </button>
            </form>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 px-4 py-6 lg:px-8">
          {flash ? <div className="mb-4"><FlashToast tone={flash.tone} message={flash.message} /></div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
