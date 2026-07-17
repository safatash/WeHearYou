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
  | "customer-resolution"
  | "settings";

import { IconName } from "@/components/icon";

export interface NavItem {
  key: ScreenKey;
  label: string;
  icon: IconName;
  href: string;
  group?: string;
  comingSoon?: boolean;
}

export const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "grid", href: "/" },

  // Requests & Feedback
  { key: "contacts", label: "Contacts", icon: "search", href: "/contacts", group: "REQUESTS & FEEDBACK" },
  { key: "campaigns", label: "Review Requests", icon: "bell", href: "/campaigns", group: "REQUESTS & FEEDBACK" },
  { key: "reviews", label: "Reviews Inbox", icon: "inbox", href: "/reviews", group: "REQUESTS & FEEDBACK" },
  { key: "customer-resolution", label: "Resolution Cases", icon: "shield", href: "/customer-resolution", group: "REQUESTS & FEEDBACK" },

  // Funnel Setup
  { key: "campaign-wizard", label: "Campaign Wizard", icon: "sparkles", href: "/campaign-wizard", group: "FUNNEL SETUP" },
  { key: "funnel-builder", label: "Funnel Builder", icon: "layers", href: "/funnel-builder", group: "FUNNEL SETUP" },

  // Website Displays
  { key: "locations", label: "Locations", icon: "pin", href: "/locations", group: "WEBSITE DISPLAYS" },
  { key: "widgets", label: "Widgets", icon: "grid", href: "/widgets", group: "WEBSITE DISPLAYS" },
  { key: "video-testimonials", label: "Video Testimonials", icon: "film", href: "/video-testimonials", group: "WEBSITE DISPLAYS" },

  // Google Local SEO
  { key: "gbp-manager", label: "GBP Manager", icon: "map", href: "/gbp", group: "GOOGLE LOCAL SEO" },
  { key: "gbp-posts", label: "GBP Posts", icon: "megaphone", href: "/gbp/posts", group: "GOOGLE LOCAL SEO" },
  { key: "gbp-photos", label: "GBP Photos", icon: "upload", href: "/gbp/photos", group: "GOOGLE LOCAL SEO" },
  { key: "gbp-qa", label: "Q&A", icon: "chat", href: "/gbp/qa", group: "GOOGLE LOCAL SEO" },

  // Settings
  { key: "automation", label: "Automation", icon: "sliders", href: "/automation", group: "SETTINGS" },
  { key: "integrations", label: "Integrations", icon: "plug", href: "/integrations", group: "SETTINGS" },
  { key: "team", label: "Team & Access", icon: "phone", href: "/team", group: "SETTINGS" },
  { key: "analytics", label: "Analytics", icon: "monitor", href: "/analytics", group: "SETTINGS" },
];
