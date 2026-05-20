export type ScreenKey =
  | "dashboard"
  | "contacts"
  | "reviews"
  | "campaigns"
  | "automation"
  | "funnel-preview"
  | "funnel-builder"
  | "campaign-wizard"
  | "locations"
  | "team"
  | "analytics"
  | "integrations"
  | "widgets"
  | "video-testimonials"
  | "settings";

export const navItems: { key: ScreenKey; label: string; icon: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "◫", href: "/" },
  { key: "contacts", label: "Contacts", icon: "☰", href: "/contacts" },
  { key: "reviews", label: "Reviews Inbox", icon: "✦", href: "/reviews" },
  { key: "campaigns", label: "Review Requests", icon: "➜", href: "/campaigns" },
  { key: "automation", label: "Automation", icon: "⟲", href: "/automation" },
  { key: "funnel-preview", label: "Funnel Page", icon: "◎", href: "/funnel-preview" },
  { key: "funnel-builder", label: "Funnel Builder", icon: "⌘", href: "/funnel-builder" },
  { key: "campaign-wizard", label: "Campaign Wizard", icon: "✦", href: "/campaign-wizard" },
  { key: "locations", label: "Locations", icon: "⌂", href: "/locations" },
  { key: "team", label: "Team & Access", icon: "♟", href: "/team" },
  { key: "analytics", label: "Analytics", icon: "◔", href: "/analytics" },
  { key: "integrations", label: "Integrations", icon: "⟗", href: "/integrations" },
  { key: "widgets", label: "Widgets", icon: "▣", href: "/widgets" },
  { key: "video-testimonials", label: "Video Testimonials", icon: "▶", href: "/video-testimonials" },
  { key: "settings", label: "Settings", icon: "⚙", href: "/settings" },
];
