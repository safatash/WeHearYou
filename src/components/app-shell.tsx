import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { FlashToast } from "@/components/flash-toast";
import { SignOutButton } from "@/components/sign-out-button";
import { MotivationBlock } from "@/components/motivation-block";
import { Icon } from "@/components/icon";
import { SearchInput } from "@/components/search-input";
import { NotificationButton } from "@/components/notification-button";
import { ExitImpersonationButton } from "@/components/exit-impersonation-button";
import { getCurrentMembership } from "@/lib/authz";
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
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--white)", color: "var(--ink-900)" }}>
      {/* Sidebar */}
      <aside style={{ flexDirection: "column", width: 248, borderRight: "1px solid var(--ink-200)", background: "var(--white)", paddingLeft: 20, paddingRight: 20, paddingTop: 24, paddingBottom: 24, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }} className="hidden lg:flex flex-col">
        <div>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-decoration-none"
          >
            <div style={{ display: "flex", height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: "var(--r-md)", background: "var(--accent)", fontSize: 18, fontWeight: "bold", color: "white" }}>
              W
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-500)", margin: 0 }}>WeHearYou</p>
              <h1 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)", margin: "4px 0 0 0" }}>Reputation</h1>
            </div>
          </Link>
        </div>

        <nav style={{ marginTop: 32, display: "flex", flex: 1, flexDirection: "column", gap: 24 }}>
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          borderRadius: "var(--r-md)",
                          padding: "8px 16px",
                          fontSize: 14,
                          fontWeight: 600,
                          transition: "all 0.2s ease",
                          background: active ? "var(--accent)" : "transparent",
                          color: active ? "white" : "var(--ink-700)",
                          boxShadow: active ? "var(--shadow-sm)" : "none",
                        }}
                      >
                        <Icon name={item.icon} size={20} style={{ color: "currentColor" }} />
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
                      <p style={{ padding: "8px 16px", fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-400)", margin: 0 }}>
                        {groupName}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                        {items.map((item) => {
                          const active = item.key === activeScreen;
                          if (item.comingSoon) {
                            return (
                              <div
                                key={item.key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  borderRadius: "var(--r-md)",
                                  padding: "8px 16px",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: "var(--ink-400)",
                                  opacity: 0.5,
                                  cursor: "not-allowed",
                                }}
                              >
                                <Icon name={item.icon} size={20} style={{ color: "currentColor" }} />
                                <span>{item.label}</span>
                                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: "bold", textTransform: "uppercase" }}>Soon</span>
                              </div>
                            );
                          }
                          return (
                            <Link
                              key={item.key}
                              href={item.href}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                borderRadius: "var(--r-md)",
                                padding: "8px 16px",
                                fontSize: 14,
                                fontWeight: 600,
                                transition: "all 0.2s ease",
                                background: active ? "var(--accent)" : "transparent",
                                color: active ? "white" : "var(--ink-700)",
                                boxShadow: active ? "var(--shadow-sm)" : "none",
                              }}
                            >
                              <Icon name={item.icon} size={20} style={{ color: "currentColor" }} />
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
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--ink-200)", paddingTop: 24 }}>
          <MotivationBlock
            title="You're doing great!"
            subtitle="Keep collecting those reviews."
            icon="🏆"
          />
        </div>
      </aside>

      <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--ink-200)", background: "rgba(255, 255, 255, 0.95)", paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 16, backdropFilter: "blur(10px)" }} className="lg:px-8">
          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 16 }}>
            <SearchInput />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LocationSwitcher locations={locations} />
            <NotificationButton />
            <UserDropdown userName={userName} userEmail={userEmail} />
          </div>
        </header>

        {/* Impersonation banner */}
        {isImpersonating && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #fcd34d", background: "#fef3c7", paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10 }} className="lg:px-8">
            <p style={{ fontSize: 14, fontWeight: 600, color: "#78350f", margin: 0 }}>
              👁 Viewing as <span style={{ color: "#b45309" }}>{membership?.user.name ?? membership?.user.email}</span> · {membership?.organization.name}
            </p>
            <ExitImpersonationButton />
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, paddingLeft: 16, paddingRight: 16, paddingTop: 24, paddingBottom: 24 }} className="lg:px-8">
          {flash ? <div style={{ marginBottom: 16 }}><FlashToast tone={flash.tone} message={flash.message} /></div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
