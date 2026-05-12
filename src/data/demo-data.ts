export type ScreenKey =
  | "dashboard"
  | "contacts"
  | "reviews"
  | "campaigns"
  | "automation"
  | "funnel-preview"
  | "funnel-builder"
  | "locations"
  | "team"
  | "billing"
  | "analytics"
  | "integrations"
  | "settings";

export type ReviewItem = {
  id: number;
  name: string;
  source: "Google" | "Facebook";
  rating: number;
  date: string;
  message: string;
  sentiment: "positive" | "neutral" | "negative";
  status: "published" | "needs-follow-up" | "private-feedback";
};

export type WorkflowNode = {
  id: string;
  title: string;
  type: string;
  description: string;
  config: string[];
};

export type ContactRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  lastInvite: string;
  tags: string[];
  notes: string;
  preferredChannel: "SMS" | "Email";
  locationId: number;
};

export type CampaignRow = {
  id: number;
  contactName: string;
  contactId: number;
  status: string;
  channel: "SMS" | "Email";
  dateSent: string;
  outcome: string;
  token: string;
  workflow: string;
};

export type LocationRow = {
  id: number;
  name: string;
  city: string;
  state: string;
  status: string;
  reviewLink: string;
  manager: string;
  contactCount: number;
  avgRating: string;
};

export type TeamMemberRow = {
  id: number;
  name: string;
  email: string;
  role: "Agency Admin" | "Location Manager" | "Analyst" | "Support";
  accessScope: string;
  status: "Active" | "Invited";
  locations: number[];
  permissions: string[];
};

export const navItems: { key: ScreenKey; label: string; icon: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "◫", href: "/" },
  { key: "contacts", label: "Contacts", icon: "☰", href: "/contacts" },
  { key: "reviews", label: "Reviews Inbox", icon: "✦", href: "/reviews" },
  { key: "campaigns", label: "Review Requests", icon: "➜", href: "/campaigns" },
  { key: "automation", label: "Automation", icon: "⟲", href: "/automation" },
  { key: "funnel-preview", label: "Funnel Page", icon: "◎", href: "/funnel-preview" },
  { key: "funnel-builder", label: "Funnel Builder", icon: "⌘", href: "/funnel-builder" },
  { key: "locations", label: "Locations", icon: "⌂", href: "/locations" },
  { key: "team", label: "Team & Access", icon: "♟", href: "/team" },
  { key: "billing", label: "Billing", icon: "◍", href: "/billing" },
  { key: "analytics", label: "Analytics", icon: "◔", href: "/analytics" },
  { key: "integrations", label: "Integrations", icon: "⟗", href: "/integrations" },
  { key: "settings", label: "Settings", icon: "⚙", href: "/settings" },
];

export const reviews: ReviewItem[] = [
  {
    id: 1,
    name: "Ava Johnson",
    source: "Google",
    rating: 5,
    date: "Today, 2:14 PM",
    message: "Super easy experience, the team was fast and genuinely helpful.",
    sentiment: "positive",
    status: "published",
  },
  {
    id: 2,
    name: "Carlos Mendez",
    source: "Facebook",
    rating: 4,
    date: "Today, 10:21 AM",
    message: "Staff was great. Would love slightly faster follow-up after booking.",
    sentiment: "positive",
    status: "needs-follow-up",
  },
  {
    id: 3,
    name: "Priya Patel",
    source: "Google",
    rating: 2,
    date: "Yesterday",
    message: "The service was okay, but communication after the appointment felt unclear.",
    sentiment: "negative",
    status: "private-feedback",
  },
  {
    id: 4,
    name: "Marcus Lee",
    source: "Google",
    rating: 3,
    date: "Apr 14",
    message: "Decent overall, but I had to wait longer than expected before hearing back.",
    sentiment: "neutral",
    status: "private-feedback",
  },
];

export const workflowNodes: WorkflowNode[] = [
  {
    id: "trigger",
    title: "Appointment Completed",
    type: "Trigger",
    description: "Starts when a service appointment is marked complete, matching the plugin webhook event flow.",
    config: ["Source system: booking app", "Event key: appointment_completed", "Only active contacts"],
  },
  {
    id: "wait",
    title: "Wait 2 hours",
    type: "Delay",
    description: "Mirrors the plugin's delay_hours automation rule before sending a review request.",
    config: ["Delay: 2 hours", "Respect quiet hours", "Skip if already invited"],
  },
  {
    id: "action",
    title: "Send SMS Review Request",
    type: "Action",
    description: "Send the branded review funnel invite using the tokenized SMS request path.",
    config: ["Channel: SMS", "Template: Post-appointment invite", "Funnel URL: tokenized link"],
  },
];

export const funnelSteps = [
  {
    id: "step-1",
    title: "How was your experience?",
    detail: "Collect a 1 to 5 star rating and resolve the tokenized invite before branching.",
  },
  {
    id: "step-2a",
    title: "4 to 5 stars: Leave us a Google Review",
    detail: "Route happy customers to the configured Google review URL and log the redirect event.",
  },
  {
    id: "step-2b",
    title: "1 to 3 stars: Tell us how we can improve",
    detail: "Capture private feedback, notify the business, and optionally fire a webhook.",
  },
];

export const locations: LocationRow[] = [
  {
    id: 1,
    name: "Nova Dental, Brooklyn",
    city: "Brooklyn",
    state: "NY",
    status: "Active",
    reviewLink: "https://g.page/r/brooklyn-demo",
    manager: "Safa",
    contactCount: 142,
    avgRating: "4.8",
  },
  {
    id: 2,
    name: "Nova Dental, Queens",
    city: "Queens",
    state: "NY",
    status: "Active",
    reviewLink: "https://g.page/r/queens-demo",
    manager: "Maya Chen",
    contactCount: 96,
    avgRating: "4.6",
  },
  {
    id: 3,
    name: "Nova Dental, Jersey City",
    city: "Jersey City",
    state: "NJ",
    status: "Launching",
    reviewLink: "https://g.page/r/jersey-demo",
    manager: "Alex Rivera",
    contactCount: 38,
    avgRating: "4.4",
  },
];

export const teamMembers: TeamMemberRow[] = [
  {
    id: 1,
    name: "Safa Tash",
    email: "safa@wehearyou.app",
    role: "Agency Admin",
    accessScope: "All locations",
    status: "Active",
    locations: [1, 2, 3],
    permissions: ["Manage billing", "Edit automations", "Invite team", "View all reviews"],
  },
  {
    id: 2,
    name: "Maya Chen",
    email: "maya@novadental.com",
    role: "Location Manager",
    accessScope: "Queens only",
    status: "Active",
    locations: [2],
    permissions: ["Reply to reviews", "Send requests", "View location reports"],
  },
  {
    id: 3,
    name: "Alex Rivera",
    email: "alex@novadental.com",
    role: "Location Manager",
    accessScope: "Jersey City only",
    status: "Invited",
    locations: [3],
    permissions: ["View launch checklist", "Send requests", "Manage contacts"],
  },
  {
    id: 4,
    name: "Jordan Lee",
    email: "jordan@agencyops.co",
    role: "Analyst",
    accessScope: "Reporting only",
    status: "Active",
    locations: [1, 2],
    permissions: ["View dashboards", "Export reports", "Monitor review trends"],
  },
];

export const campaigns: CampaignRow[] = [
  {
    id: 101,
    contactName: "Emma Brooks",
    contactId: 1,
    status: "Sent",
    channel: "SMS",
    dateSent: "Apr 16, 3:10 PM",
    outcome: "Token created",
    token: "rr_tok_7df9e1a2",
    workflow: "Manual send",
  },
  {
    id: 102,
    contactName: "Noah Kim",
    contactId: 2,
    status: "Opened",
    channel: "Email",
    dateSent: "Apr 16, 1:42 PM",
    outcome: "Funnel opened",
    token: "rr_tok_0ab2ef91",
    workflow: "Webhook automation",
  },
  {
    id: 103,
    contactName: "Sophia Davis",
    contactId: 1,
    status: "Clicked",
    channel: "SMS",
    dateSent: "Apr 15, 6:30 PM",
    outcome: "Redirected to Google",
    token: "rr_tok_9134cdfe",
    workflow: "Post-appointment SMS",
  },
  {
    id: 104,
    contactName: "Mason Hall",
    contactId: 4,
    status: "Sent",
    channel: "Email",
    dateSent: "Apr 15, 4:12 PM",
    outcome: "Queued by workflow",
    token: "rr_tok_cab45d10",
    workflow: "project_completed rule",
  },
  {
    id: 105,
    contactName: "Isabella Reed",
    contactId: 3,
    status: "Opened",
    channel: "SMS",
    dateSent: "Apr 14, 11:05 AM",
    outcome: "Waiting on rating",
    token: "rr_tok_44fe2091",
    workflow: "Webhook automation",
  },
];

export const contacts: ContactRow[] = [
  {
    id: 1,
    name: "Emma Brooks",
    email: "emma@example.com",
    phone: "+1 (555) 201-4411",
    source: "Manual",
    status: "Active",
    lastInvite: "Today",
    tags: ["VIP", "Dental"],
    notes: "Often responds quickly to SMS review requests.",
    preferredChannel: "SMS",
    locationId: 1,
  },
  {
    id: 2,
    name: "Noah Kim",
    email: "noah@example.com",
    phone: "+1 (555) 201-8821",
    source: "Webhook",
    status: "Active",
    lastInvite: "Today",
    tags: ["Physical Therapy"],
    notes: "Came in via automation webhook after appointment_completed event.",
    preferredChannel: "Email",
    locationId: 2,
  },
  {
    id: 3,
    name: "Priya Patel",
    email: "priya@example.com",
    phone: "+1 (555) 778-3301",
    source: "CSV Import",
    status: "Needs follow-up",
    lastInvite: "Yesterday",
    tags: ["Import", "Needs attention"],
    notes: "Left low-rating private feedback and should get manual outreach.",
    preferredChannel: "SMS",
    locationId: 1,
  },
  {
    id: 4,
    name: "Marcus Lee",
    email: "marcus@example.com",
    phone: "+1 (555) 992-1188",
    source: "Webhook",
    status: "Active",
    lastInvite: "Apr 14",
    tags: ["Project Complete"],
    notes: "Driven by project_completed automation rule.",
    preferredChannel: "Email",
    locationId: 3,
  },
  {
    id: 5,
    name: "Olivia Bennett",
    email: "olivia.bennett@example.com",
    phone: "+1 (555) 314-8810",
    source: "Manual",
    status: "Active",
    lastInvite: "Not sent yet",
    tags: ["New patient", "Whitening consult"],
    notes: "Recently completed a whitening consultation. Best to follow up via SMS within 24 hours and include the Brooklyn location review funnel.",
    preferredChannel: "SMS",
    locationId: 1,
  },
];

export const trendBars = [42, 55, 49, 70, 66, 81, 92, 76, 88, 104, 98, 120];
export const responseTimeBars = [18, 16, 12, 15, 10, 9, 8, 11, 7, 6, 5, 4];
export const sentimentMix = [
  { label: "Positive", value: "68%", tone: "positive" as const },
  { label: "Neutral", value: "21%", tone: "neutral" as const },
  { label: "Negative", value: "11%", tone: "warning" as const },
];
export const channelBreakdown = [
  ["Google", "842 reviews", "+14%"],
  ["Facebook", "211 reviews", "+6%"],
  ["Private feedback", "231 responses", "+19%"],
];

export function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function getContactById(id: number) {
  return contacts.find((contact) => contact.id === id);
}

export function getCampaignById(id: number) {
  return campaigns.find((campaign) => campaign.id === id);
}

export function getCampaignsByContactId(contactId: number) {
  return campaigns.filter((campaign) => campaign.contactId === contactId);
}

export function getLocationById(id: number) {
  return locations.find((location) => location.id === id);
}

export function getContactsByLocationId(locationId: number) {
  return contacts.filter((contact) => contact.locationId === locationId);
}

export function getLocationNameById(id: number) {
  return locations.find((location) => location.id === id)?.name ?? "Unknown location";
}

export function getTeamMemberById(id: number) {
  return teamMembers.find((member) => member.id === id);
}

export function getContactNameById(id: number) {
  return contacts.find((contact) => contact.id === id)?.name ?? "Unknown contact";
}

export function getReviewById(id: number) {
  return reviews.find((review) => review.id === id);
}
