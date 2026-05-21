export type ScreenKey =
  | "dashboard"
  | "contacts"
  | "reviews"
  | "campaigns"
  | "campaign-wizard"
  | "funnel-builder"
  | "locations"
  | "widgets"
  | "video-testimonials"
  | "automation"
  | "team"
  | "analytics"
  | "integrations";

export interface NavItem {
  key: ScreenKey;
  label: string;
  icon: string;
  href: string;
  group?: string;
}

export const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "◫", href: "/" },

  // Requests & Feedback
  { key: "contacts", label: "Contacts", icon: "☰", href: "/contacts", group: "REQUESTS & FEEDBACK" },
  { key: "campaigns", label: "Review Requests", icon: "➜", href: "/campaigns", group: "REQUESTS & FEEDBACK" },
  { key: "reviews", label: "Reviews Inbox", icon: "✦", href: "/reviews", group: "REQUESTS & FEEDBACK" },

  // Funnel Setup
  { key: "campaign-wizard", label: "Campaign Wizard", icon: "✨", href: "/campaign-wizard", group: "FUNNEL SETUP" },
  { key: "funnel-builder", label: "Funnel Builder", icon: "⌘", href: "/funnel-builder", group: "FUNNEL SETUP" },

  // Website Displays
  { key: "locations", label: "Locations", icon: "⌂", href: "/locations", group: "WEBSITE DISPLAYS" },
  { key: "widgets", label: "Widgets", icon: "▣", href: "/widgets", group: "WEBSITE DISPLAYS" },
  { key: "video-testimonials", label: "Video Testimonials", icon: "▶", href: "/video-testimonials", group: "WEBSITE DISPLAYS" },

  // Settings
  { key: "automation", label: "Automation", icon: "⟲", href: "/automation", group: "SETTINGS" },
  { key: "integrations", label: "Integrations", icon: "⟗", href: "/integrations", group: "SETTINGS" },
  { key: "team", label: "Team & Access", icon: "♟", href: "/team", group: "SETTINGS" },
  { key: "analytics", label: "Analytics", icon: "◔", href: "/analytics", group: "SETTINGS" },
];
