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
  | "integrations"
  | "gbp-manager"
  | "gbp-posts"
  | "gbp-photos"
  | "gbp-qa"
  | "funnel-preview"
  | "review-links"
  | "settings";

export interface NavItem {
  key: ScreenKey;
  label: string;
  icon: string;
  href: string;
  group?: string;
  comingSoon?: boolean;
}

export const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "◫", href: "/" },

  // Requests & Feedback
  { key: "contacts", label: "Contacts", icon: "☰", href: "/contacts", group: "REQUESTS & FEEDBACK" },
  { key: "campaigns", label: "Review Requests", icon: "➜", href: "/campaigns", group: "REQUESTS & FEEDBACK" },
  { key: "review-links", label: "Review Links", icon: "🔗", href: "/review-links", group: "REQUESTS & FEEDBACK" },
  { key: "reviews", label: "Reviews Inbox", icon: "✦", href: "/reviews", group: "REQUESTS & FEEDBACK" },

  // Funnel Setup
  { key: "campaign-wizard", label: "Campaign Wizard", icon: "✨", href: "/campaign-wizard", group: "FUNNEL SETUP" },
  { key: "funnel-builder", label: "Funnel Builder", icon: "⌘", href: "/funnel-builder", group: "FUNNEL SETUP" },

  // Website Displays
  { key: "locations", label: "Locations", icon: "⌂", href: "/locations", group: "WEBSITE DISPLAYS" },
  { key: "widgets", label: "Widgets", icon: "▣", href: "/widgets", group: "WEBSITE DISPLAYS" },
  { key: "video-testimonials", label: "Video Testimonials", icon: "▶", href: "/video-testimonials", group: "WEBSITE DISPLAYS" },

  // Google Local SEO
  { key: "gbp-manager", label: "GBP Manager", icon: "🗺", href: "/gbp", group: "GOOGLE LOCAL SEO" },
  { key: "gbp-posts", label: "Rank Tracker", icon: "📊", href: "/gbp/rank", group: "GOOGLE LOCAL SEO", comingSoon: true },
  { key: "gbp-photos", label: "Competitors", icon: "🏆", href: "/gbp/competitors", group: "GOOGLE LOCAL SEO", comingSoon: true },
  { key: "gbp-qa", label: "Reports", icon: "📋", href: "/gbp/reports", group: "GOOGLE LOCAL SEO", comingSoon: true },

  // Settings
  { key: "automation", label: "Automation", icon: "⟲", href: "/automation", group: "SETTINGS" },
  { key: "integrations", label: "Integrations", icon: "⟗", href: "/integrations", group: "SETTINGS" },
  { key: "team", label: "Team & Access", icon: "♟", href: "/team", group: "SETTINGS" },
  { key: "analytics", label: "Analytics", icon: "◔", href: "/analytics", group: "SETTINGS" },
];
