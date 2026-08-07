/* WeHearYou — Location model builder + mini-site config.
   buildLocationModel(loc) merges a base LOCATIONS entry with the full
   public-mini-site data model the spec calls for. Deterministic per location. */

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* status → presentation */
const LOC_STATUS = {
  active:  { label: "Active",      cls: "badge-success", dot: "var(--success)" },
  draft:   { label: "Draft",       cls: "badge-neutral", dot: "var(--ink-400)" },
  paused:  { label: "Paused",      cls: "badge-warning", dot: "var(--warning)" },
  setup:   { label: "Needs setup", cls: "badge-warning", dot: "var(--warning)" },
};

/* per-location status assignment (showcase variety) */
const STATUS_BY_ID = { dt: "active", wp: "active", nb: "setup" };

/* shared, curated featured reviews for the public mini-site (dental) */
const MINI_FEATURED = [
  { id: "f1", name: "Marcus Webb",    rating: 5, source: "Google",     date: "2 days ago", featured: true,
    text: "Dr. Lin and the whole team were incredible. I came in nervous about a root canal and left genuinely impressed — painless, fast, and they explained every step. Best dental experience I've had." },
  { id: "f2", name: "Sara Mendel",    rating: 5, source: "Yelp",       date: "5 days ago", featured: true,
    text: "Booked online in two minutes and got a reminder text the day before. The whole thing was seamless and the office is spotless. Highly recommend the Downtown team." },
  { id: "f3", name: "Jordan Avery",   rating: 5, source: "Google",     date: "1 week ago",
    text: "I've been to a lot of dentists and none made me feel this taken care of. They remembered details about my last visit and even checked in afterward." },
  { id: "f4", name: "Lena Fischer",   rating: 5, source: "Trustpilot", date: "1 week ago",
    text: "Transparent pricing up front — no surprise bills, which is rare these days. Friendly front desk and a genuinely gentle hygienist." },
  { id: "f5", name: "Caleb Nwosu",    rating: 5, source: "Google",     date: "2 weeks ago",
    text: "Brought my whole family here after one visit. Kids weren't scared, billing was clear, and the care was top-notch across the board." },
  { id: "f6", name: "Mara Lindqvist", rating: 4, source: "Facebook",   date: "3 weeks ago",
    text: "The office runs like clockwork and everyone is warm. Knocked one star only for a short wait — otherwise a fantastic practice." },
];

const MINI_VIDEO = {
  id: "mv1", name: "Tom Becker", length: "0:34", hue: 188,
  quote: "They actually run on time and my kids weren't scared at all — a small miracle.",
};

const SERVICES = ["Cleanings & Checkups", "Teeth Whitening", "Invisalign®", "Dental Implants", "Emergency Care", "Pediatric Dentistry"];
const HIGHLIGHTS = ["Friendly staff", "Low wait times", "Modern office", "Clear pricing", "Gentle care", "Easy scheduling"];

const HOURS = [
  { d: "Monday",    h: "8:00 AM – 6:00 PM" },
  { d: "Tuesday",   h: "8:00 AM – 6:00 PM" },
  { d: "Wednesday", h: "8:00 AM – 6:00 PM" },
  { d: "Thursday",  h: "8:00 AM – 6:00 PM" },
  { d: "Friday",    h: "8:00 AM – 5:00 PM" },
  { d: "Saturday",  h: "9:00 AM – 2:00 PM" },
  { d: "Sunday",    h: "Closed", closed: true },
];

const CTA_TYPES = [
  { key: "review",   label: "Leave a review",   icon: "star" },
  { key: "book",     label: "Book appointment",  icon: "clock" },
  { key: "call",     label: "Call now",          icon: "phone" },
  { key: "website",  label: "Visit website",     icon: "external" },
  { key: "directions", label: "Get directions",  icon: "pin" },
];

/* deterministic-ish derived metrics per location */
function buildLocationModel(loc) {
  const statusKey = STATUS_BY_ID[loc.id] || "active";
  const slug = `bright-smile-${slugify(loc.area)}`;
  const incomplete = statusKey === "setup";

  // featured = first 6 curated; for incomplete location, fewer reviews
  const featured = MINI_FEATURED.slice(0, incomplete ? 3 : 6);

  const conv = loc.id === "dt" ? 31 : loc.id === "wp" ? 24 : 12;
  const pageViews = { dt: 3128, wp: 1740, nb: 412 }[loc.id] || 800;

  return {
    ...loc,
    slug,
    publicUrl: `wehearyou.com/l/${slug}`,
    reviewUrl: `wehearyou.com/r/${slug}`,
    statusKey,
    published: !incomplete,
    incomplete,
    missingSteps: incomplete
      ? ["Add a cover image", "Write a business description", "Connect Google Business Profile", "Set the primary call-to-action"]
      : [],
    locId: `LOC-${loc.id.toUpperCase()}-${loc.id === "dt" ? "8841" : loc.id === "wp" ? "8842" : "8843"}`,
    description: "A modern, comfort-first dental practice in the heart of the city. Same-day emergency care, gentle cleanings, and clear, upfront pricing — trusted by thousands of patients.",
    headline: loc.name,
    subheadline: `${loc.area} · ${loc.city.split(",")[0]}`,
    website: "brightsmiledental.com",
    timezone: "America/Los_Angeles (PT)",
    hours: HOURS,
    services: SERVICES,
    highlights: HIGHLIGHTS,
    cta: { type: "review", label: "Leave a review" },
    settings: {
      showReviewSummary: true,
      showFeatured: true,
      showVideo: loc.id !== "nb",
      showSources: true,
      showMap: true,
      showHours: true,
      showVerified: true,
      showPoweredBy: true,
    },
    featured,
    video: loc.id !== "nb" ? MINI_VIDEO : null,
    // metrics
    newThisMonth: loc.newThisMonth,
    requestConversion: conv,
    pageViews,
    pageViewsDelta: loc.id === "dt" ? 14 : loc.id === "wp" ? 6 : -3,
    clicks: {
      dt: { website: 412, directions: 689, call: 254 },
      wp: { website: 221, directions: 318, call: 142 },
      nb: { website: 54, directions: 88, call: 31 },
    }[loc.id] || { website: 100, directions: 100, call: 100 },
    requestPerf: {
      sent: { dt: 1840, wp: 960, nb: 120 }[loc.id] || 500,
      openRate: { dt: 64, wp: 58, nb: 41 }[loc.id] || 50,
      clickRate: { dt: 38, wp: 29, nb: 18 }[loc.id] || 25,
      conversion: conv,
      bestChannel: "SMS",
    },
    team: loc.id === "dt"
      ? [{ name: loc.manager, role: "Practice lead" }, { name: "Jamie Ortiz", role: "Front office" }]
      : [{ name: loc.manager, role: "Practice lead" }],
    createdDate: "Jan 14, 2025",
    lastUpdated: loc.id === "dt" ? "Jun 17, 2026 · 2:10 PM" : "Jun 12, 2026 · 9:40 AM",
    lastSynced: "2 days ago",
  };
}

Object.assign(window, { buildLocationModel, LOC_STATUS, CTA_TYPES, MINI_FEATURED, MINI_VIDEO, slugify });
