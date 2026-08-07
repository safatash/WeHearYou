import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { FlashToast } from "@/components/flash-toast";
import { SignOutButton } from "@/components/sign-out-button";
import { Icon } from "@/components/icon";
import { SearchInput } from "@/components/search-input";
import { NotificationButton } from "@/components/notification-button";
import { ExitImpersonationButton } from "@/components/exit-impersonation-button";
import { TrialBanner } from "@/components/trial-banner";
import { getCurrentMembership } from "@/lib/authz";
import { navItems, type ScreenKey } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";
import { LocationSwitcher } from "@/components/location-switcher";
import { SidebarNav, MobileNav } from "@/components/sidebar-nav";
import { UserDropdown } from "@/components/user-dropdown";

export async function AppShell({
  children,
  activeScreen,
  flash,
  selectedLocationId,
}: {
  children: React.ReactNode;
  activeScreen: ScreenKey;
  flash?: { tone?: "success" | "error" | "info"; message: string } | null;
  selectedLocationId?: string;
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

  // Trial banner state (informational — independent of enforcement).
  const bOrg = membership?.organization;
  const bSubscribed = Boolean(bOrg?.stripeSubscriptionId) && (bOrg?.stripeSubscriptionStatus === "active" || bOrg?.stripeSubscriptionStatus === "trialing");
  const nowMs = new Date().getTime();
  const trialDaysLeft =
    bOrg?.trialEndsAt && !bSubscribed && bOrg.trialEndsAt.getTime() > nowMs
      ? Math.ceil((bOrg.trialEndsAt.getTime() - nowMs) / (24 * 60 * 60 * 1000))
      : null;

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
      <SidebarNav activeScreen={activeScreen} />

      <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
        {/* Header */}
        <header
          aria-label="Application"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            minHeight: "var(--topbar-h)",
            borderBottom: "1px solid var(--ink-200)",
            background: "rgba(255,255,255,.92)",
            padding: "10px 16px",
            backdropFilter: "blur(10px)",
          }}
          className="lg:px-8"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <MobileNav activeScreen={activeScreen} />
            <SearchInput />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            <LocationSwitcher locations={locations} currentLocationId={selectedLocationId} />
            <NotificationButton />
            <UserDropdown userName={userName} userEmail={userEmail} />
          </div>
        </header>

        {/* Impersonation banner */}
        {isImpersonating && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              borderBottom: "1px solid color-mix(in srgb, var(--warning) 40%, var(--white))",
              background: "var(--warning-soft)",
              padding: "9px 16px",
            }}
            className="lg:px-8"
          >
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink-800)", margin: 0 }}>
              <Icon name="eye" size={15} aria-hidden="true" />
              Viewing as <strong style={{ fontWeight: 700 }}>{membership?.user.name ?? membership?.user.email}</strong> · {membership?.organization.name}
            </p>
            <ExitImpersonationButton />
          </div>
        )}

        {/* Trial banner */}
        {trialDaysLeft != null && <TrialBanner daysLeft={trialDaysLeft} />}

        {/* Main content */}
        <main id="main" style={{ flex: 1, padding: "22px 16px 40px" }} className="lg:px-8">
          {flash ? <div style={{ marginBottom: 16 }}><FlashToast tone={flash.tone} message={flash.message} /></div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
