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

  // Fetch locations for the switcher
  const locations = membership
    ? await prisma.location.findMany({
        where: { organizationId: membership.organizationId },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--page)", color: "var(--ink-900)" }}>
      {/* Sidebar */}
      <aside
        style={{
          display: "none",
          width: "var(--sidebar-w)",
          flexDirection: "column",
          borderRight: "1px solid var(--ink-200)",
          background: "var(--white)",
          padding: "24px 20px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
        className="lg:flex"
      >
        {/* Logo */}
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: "var(--r-md)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              W
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                WeHearYou
              </p>
              <h1 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)", margin: 0 }}>Reputation</h1>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
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
                          padding: "10px 16px",
                          borderRadius: "var(--r-md)",
                          fontSize: 14,
                          fontWeight: 600,
                          textDecoration: "none",
                          color: active ? "white" : "var(--ink-700)",
                          background: active ? "var(--accent)" : "transparent",
                          transition: "all 0.2s",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
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
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-400)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 16px", margin: 0 }}>
                        {groupName}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
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
                                  padding: "10px 16px",
                                  borderRadius: "var(--r-md)",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: "var(--ink-400)",
                                  opacity: 0.5,
                                  cursor: "not-allowed",
                                }}
                              >
                                <span style={{ fontSize: 18 }}>{item.icon}</span>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-400)" }}>Soon</span>
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
                                padding: "10px 16px",
                                borderRadius: "var(--r-md)",
                                fontSize: 14,
                                fontWeight: 600,
                                textDecoration: "none",
                                color: active ? "white" : "var(--ink-700)",
                                background: active ? "var(--accent)" : "transparent",
                                transition: "all 0.2s",
                              }}
                            >
                              <span style={{ fontSize: 18 }}>{item.icon}</span>
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

        {/* Footer motivation block */}
        <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid var(--ink-150)" }}>
          <MotivationBlock
            title="You're doing great!"
            subtitle="Keep collecting those reviews."
            icon="🏆"
          />
        </div>
      </aside>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", minHeight: "100vh" }}>
        {/* Header */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "var(--topbar-h)",
            borderBottom: "1px solid var(--ink-200)",
            background: "var(--white)",
            padding: "0 20px",
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
          }}
          className="lg:px-8"
        >
          {/* Left side - Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <input
              type="text"
              placeholder="Search..."
              style={{
                padding: "8px 16px",
                borderRadius: "var(--r-full)",
                border: "1px solid var(--ink-200)",
                background: "var(--white)",
                fontSize: 14,
                width: "300px",
              }}
            />
          </div>

          {/* Right side - Location switcher, notifications, user */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LocationSwitcher locations={locations} />

            <button
              style={{
                padding: "8px 16px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--ink-200)",
                background: "var(--white)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                color: "var(--ink-700)",
              }}
            >
              🔔
            </button>

            <UserDropdown userName={userName} userEmail={userEmail} />
          </div>
        </header>

        {/* Impersonation banner */}
        {isImpersonating && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 20px", borderBottom: "1px solid var(--warning)", background: "color-mix(in srgb, var(--warning) 10%, var(--white))", fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }} className="lg:px-8">
            <p style={{ margin: 0 }}>
              👁 Viewing as <strong>{membership?.user.name ?? membership?.user.email}</strong> · {membership?.organization.name}
            </p>
            <form action={stopImpersonation}>
              <button type="submit" className="btn btn-sm btn-secondary">
                Exit impersonation
              </button>
            </form>
          </div>
        )}

        {/* Main content area */}
        <main style={{ flex: 1, padding: "0 20px" }} className="lg:px-8">
          {flash ? (
            <div style={{ marginBottom: 16 }}>
              <FlashToast tone={flash.tone} message={flash.message} />
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
