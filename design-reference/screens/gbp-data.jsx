/* GBP Manager — mock data, shaped to mirror the Google Business Profile API.
   Field names intentionally track real resources (accounts.locations, reviews,
   localPosts, Performance API metrics) so the mock layer can be swapped for live
   API calls without reshaping the UI. See "Build Spec" for the mapping. */

/* ---------- Google connection (OAuth / account) ---------- */
const GBP_CONNECTION = {
  connected: true,
  account: { name: "accounts/114820394857", accountName: "Bright Smile Dental Group", type: "ORGANIZATION" },
  email: "ops@brightsmiledental.com",
  scopes: ["business.manage"],
  tokenExpires: "in 41 minutes (auto-refreshes)",
  lastSync: "8 minutes ago",
  apiQuota: { used: 1840, limit: 5000, window: "per day" },
};

/* ---------- Locations (accounts.locations) ----------
   maps to: title, storefrontAddress, phoneNumbers.primaryPhone, websiteUri,
   metadata.placeId / mapsUri, openInfo.status, categories, profile */
const GBP_LOCATIONS = [
  {
    id: "dt", locationName: "locations/12184098345",
    title: "Bright Smile Dental", area: "Downtown",
    placeId: "ChIJ-dt-0142", mapsUri: "https://maps.google.com/?cid=8841",
    address: "210 Market St, Suite 400", city: "San Francisco, CA 94103",
    primaryPhone: "(415) 555-0142", websiteUri: "brightsmiledental.com",
    primaryCategory: "Dentist", openStatus: "OPEN", verified: true,
    rating: 4.6, reviewCount: 1284, unreplied: 2, deltaRating: 0.2,
    profileComplete: 96, hue: 188,
    spark: [4.3,4.4,4.4,4.5,4.5,4.5,4.6,4.6,4.6,4.6,4.6,4.7],
    impressions30d: 18420, impressionsDelta: 12, actions30d: 1342,
  },
  {
    id: "wp", locationName: "locations/12184098346",
    title: "Bright Smile Dental", area: "Westpark",
    placeId: "ChIJ-wp-0177", mapsUri: "https://maps.google.com/?cid=8842",
    address: "88 Parkway Blvd", city: "San Jose, CA 95110",
    primaryPhone: "(408) 555-0177", websiteUri: "brightsmiledental.com",
    primaryCategory: "Dentist", openStatus: "OPEN", verified: true,
    rating: 4.3, reviewCount: 642, unreplied: 3, deltaRating: 0.1,
    profileComplete: 82, hue: 152,
    spark: [4.1,4.2,4.2,4.2,4.3,4.3,4.3,4.3,4.4,4.3,4.3,4.3],
    impressions30d: 9240, impressionsDelta: 6, actions30d: 681,
  },
  {
    id: "nb", locationName: "locations/12184098347",
    title: "Bright Smile Dental", area: "Northbridge",
    placeId: "ChIJ-nb-0193", mapsUri: "https://maps.google.com/?cid=8843",
    address: "1400 North Bridge Ave", city: "Oakland, CA 94607",
    primaryPhone: "(510) 555-0193", websiteUri: "brightsmiledental.com",
    primaryCategory: "Dentist", openStatus: "CLOSED", verified: false,
    rating: 3.9, reviewCount: 318, unreplied: 9, deltaRating: -0.3,
    profileComplete: 54, hue: 24,
    spark: [4.2,4.1,4.1,4.0,4.0,3.9,3.9,4.0,3.9,3.9,3.8,3.9],
    impressions30d: 2980, impressionsDelta: -8, actions30d: 173,
  },
];
const GBP_ALL = { id: "all", title: "All locations", area: "3 profiles connected", rating: 4.4, reviewCount: 2244 };

/* ---------- Dashboard metrics ---------- */
const GBP_METRICS = [
  { key: "impressions", label: "Profile views (30d)", value: "30,640", delta: +9.4, deltaLabel: "vs prior 30d", spark: [820,910,880,1010,1180,1090,1240,1180,1320,1410,1380,1520], tone: "up" },
  { key: "rating", label: "Average rating", value: "4.4", suffix: "★", delta: +0.1, deltaLabel: "vs prior 30d", spark: [4.2,4.3,4.3,4.3,4.4,4.4,4.4,4.4,4.4,4.4,4.4,4.4], tone: "up" },
  { key: "actions", label: "Customer actions", value: "2,196", delta: +6.1, deltaLabel: "calls, directions, clicks", spark: [120,140,135,158,160,183,185,186,188,190,191,196], tone: "up" },
  { key: "unreplied", label: "Reviews to reply", value: "14", delta: -3, deltaLabel: "since yesterday", spark: [22,21,20,19,18,17,16,16,15,16,15,14], tone: "down-good" },
];

/* ---------- Performance API time series (multiDailyMetricsTimeSeries) ---------- */
const GBP_PERF_SERIES = [
  { t: "Mar 17", maps: 410, search: 610, calls: 38, directions: 71, website: 52 },
  { t: "Mar 24", maps: 440, search: 660, calls: 44, directions: 80, website: 58 },
  { t: "Mar 31", maps: 430, search: 640, calls: 41, directions: 76, website: 54 },
  { t: "Apr 7",  maps: 510, search: 720, calls: 52, directions: 92, website: 61 },
  { t: "Apr 14", maps: 495, search: 710, calls: 49, directions: 88, website: 60 },
  { t: "Apr 21", maps: 560, search: 790, calls: 58, directions: 101, website: 70 },
  { t: "Apr 28", maps: 600, search: 830, calls: 63, directions: 110, website: 73 },
  { t: "May 5",  maps: 610, search: 820, calls: 61, directions: 108, website: 72 },
  { t: "May 12", maps: 690, search: 910, calls: 72, directions: 124, website: 84 },
  { t: "May 19", maps: 740, search: 980, calls: 78, directions: 131, website: 89 },
  { t: "May 26", maps: 720, search: 950, calls: 74, directions: 126, website: 86 },
  { t: "Jun 2",  maps: 810, search: 1040, calls: 84, directions: 142, website: 95 },
];

/* rating + review volume trend (for the dashboard area/bar chart) */
const GBP_TREND = [
  { t: "Mar 17", rating: 4.2, volume: 38 }, { t: "Mar 24", rating: 4.3, volume: 44 },
  { t: "Mar 31", rating: 4.3, volume: 41 }, { t: "Apr 7", rating: 4.4, volume: 52 },
  { t: "Apr 14", rating: 4.4, volume: 49 }, { t: "Apr 21", rating: 4.4, volume: 58 },
  { t: "Apr 28", rating: 4.5, volume: 63 }, { t: "May 5", rating: 4.4, volume: 61 },
  { t: "May 12", rating: 4.5, volume: 72 }, { t: "May 19", rating: 4.5, volume: 78 },
  { t: "May 26", rating: 4.4, volume: 74 }, { t: "Jun 2", rating: 4.5, volume: 84 },
];

/* breakdown of customer actions (Performance API action metrics) */
const GBP_ACTIONS = [
  { name: "Directions", value: 1095, pct: 50, color: "var(--src-google)" },
  { name: "Calls", value: 627, pct: 29, color: "var(--src-trustpilot)" },
  { name: "Website", value: 474, pct: 21, color: "var(--accent)" },
];
/* search keywords (searchkeywords.impressions) */
const GBP_KEYWORDS = [
  { term: "dentist near me", impressions: 4820, trend: +14 },
  { term: "teeth whitening san francisco", impressions: 2140, trend: +31 },
  { term: "emergency dentist downtown", impressions: 1680, trend: +8 },
  { term: "invisalign provider", impressions: 1190, trend: -4 },
  { term: "bright smile dental", impressions: 980, trend: +2 },
  { term: "pediatric dentist", impressions: 760, trend: +19 },
];

/* ---------- Reviews (accounts.locations.reviews) ----------
   maps to: reviewer.displayName, starRating, comment, createTime, reviewReply.comment */
const GBP_REVIEWS = [
  { id: "AbF1", reviewer: "Marcus Webb", starRating: 5, createTime: "12m ago", loc: "Downtown", locId: "dt",
    reply: null, comment: "Dr. Lin and the whole team were incredible. Came in nervous about a root canal and left genuinely impressed — painless, fast, every step explained. Best dental experience I've had." },
  { id: "AbF2", reviewer: "Priya Anand", starRating: 4, createTime: "1h ago", loc: "Westpark", locId: "wp",
    reply: null, comment: "Great hygienist and a clean, modern office. Only reason it's not 5 stars is the wait — about 20 minutes past my appointment. Otherwise very happy with the care." },
  { id: "AbF3", reviewer: "Dani Okafor", starRating: 2, createTime: "3h ago", loc: "Northbridge", locId: "nb",
    reply: null, comment: "Front desk mixed up my insurance and I got billed for something that should've been covered. The dentist was fine but the admin side needs work." },
  { id: "AbF4", reviewer: "Sara Mendel", starRating: 5, createTime: "5h ago", loc: "Downtown", locId: "dt",
    reply: { comment: "Thank you Sara! We're so glad booking was seamless — see you at your next visit.", time: "4h ago" },
    comment: "Booked online in two minutes and got a reminder text the day before. Whole thing was seamless. Highly recommend the downtown location." },
  { id: "AbF5", reviewer: "Tom Becker", starRating: 5, createTime: "Yesterday", loc: "Downtown", locId: "dt",
    reply: { comment: "We appreciate the kind words, Tom! Glad the kids felt at ease.", time: "Yesterday" },
    comment: "Friendly staff, gorgeous office, and they actually run on time. My kids weren't scared at all which is a small miracle." },
  { id: "AbF6", reviewer: "Lena Fischer", starRating: 1, createTime: "Yesterday", loc: "Northbridge", locId: "nb",
    reply: null, comment: "Waited 45 minutes past my appointment and then was told the hygienist had left for the day. Nobody apologized. Very frustrating." },
  { id: "AbF7", reviewer: "Jordan Avery", starRating: 5, createTime: "2d ago", loc: "Downtown", locId: "dt",
    reply: { comment: "Thank you, Jordan — we love seeing returning patients!", time: "2d ago" },
    comment: "Been to a lot of dentists and none made me feel this taken care of. They remembered details about my last visit and checked in afterward." },
  { id: "AbF8", reviewer: "Mara Lindqvist", starRating: 4, createTime: "3d ago", loc: "Westpark", locId: "wp",
    reply: null, comment: "The office runs like clockwork and everyone is warm. Knocked one star for a short wait, otherwise a fantastic practice." },
  { id: "AbF9", reviewer: "Caleb Nwosu", starRating: 5, createTime: "4d ago", loc: "Downtown", locId: "dt",
    reply: { comment: "So glad your whole family feels at home here, Caleb!", time: "4d ago" },
    comment: "Brought my whole family here after one visit. Kids weren't scared, billing was clear, and the care was top-notch." },
  { id: "AbF10", reviewer: "Rosa Iglesias", starRating: 3, createTime: "5d ago", loc: "Westpark", locId: "wp",
    reply: null, comment: "Care itself was good but parking is a nightmare and the online forms didn't save, so I filled them out twice." },
];

/* ---------- AI reply drafts (generated locally — NEVER auto-published) ----------
   status flow: generated → (edited) → approved → confirmed write to Google */
const GBP_REPLY_DRAFTS = [
  { id: "d1", reviewId: "AbF1", reviewer: "Marcus Webb", starRating: 5, loc: "Downtown",
    snippet: "Came in nervous about a root canal and left genuinely impressed…",
    tone: "Warm", status: "generated", confidence: 0.94,
    draft: "Thank you so much, Marcus! We're thrilled Dr. Lin and the team made your root canal a comfortable experience. Clear communication is something we work hard at — we'll pass your kind words along. See you at your next visit!" },
  { id: "d2", reviewId: "AbF3", reviewer: "Dani Okafor", starRating: 2, loc: "Northbridge",
    snippet: "Front desk mixed up my insurance and I got billed…",
    tone: "Apologetic", status: "generated", confidence: 0.71, flagged: true,
    draft: "We're truly sorry about the billing mix-up, Dani — that's not the experience we want for anyone. Our Northbridge office manager will reach out today to review your claim and make it right. Thank you for letting us know." },
  { id: "d3", reviewId: "AbF6", reviewer: "Lena Fischer", starRating: 1, loc: "Northbridge",
    snippet: "Waited 45 minutes and was told the hygienist had left…",
    tone: "Apologetic", status: "generated", confidence: 0.63, flagged: true,
    draft: "Lena, we sincerely apologize — a 45-minute wait followed by a cancellation is unacceptable and we understand your frustration. Our practice lead would like to make this right and reschedule at your convenience. Please expect a call from us today." },
  { id: "d4", reviewId: "AbF2", reviewer: "Priya Anand", starRating: 4, loc: "Westpark",
    snippet: "Great hygienist and a clean, modern office…",
    tone: "Warm", status: "approved", confidence: 0.89,
    draft: "Thank you, Priya! We're glad you had a good visit. You're right that the wait fell short of our standard — we're actively working on scheduling so every appointment starts on time." },
  { id: "d5", reviewId: "AbF8", reviewer: "Mara Lindqvist", starRating: 4, loc: "Westpark",
    snippet: "The office runs like clockwork and everyone is warm…",
    tone: "Concise", status: "approved", confidence: 0.92,
    draft: "Thanks for the kind words, Mara! We're always tightening up wait times and appreciate your patience. See you next cleaning!" },
];
const AI_TONES = ["Warm", "Professional", "Concise", "Apologetic"];

/* ---------- Google Posts (accounts.locations.localPosts) ----------
   topicType: STANDARD | EVENT | OFFER  (Product posts intentionally excluded —
   not supported via API). state: LIVE | DRAFT | SCHEDULED | PENDING | REJECTED */
const GBP_POSTS = [
  { id: "p1", topicType: "OFFER", state: "LIVE", loc: "Downtown", locId: "dt",
    title: "$99 New Patient Exam + X-Ray", summary: "New to Bright Smile? Get a complete exam, cleaning, and digital X-rays for $99 this month. Same-week appointments available.",
    cta: "Redeem online", couponCode: "SMILE99", terms: "New patients only. Through Jun 30.",
    publishTime: "Jun 18, 2026", views: 1240, clicks: 86, media: true, hue: 188 },
  { id: "p2", topicType: "EVENT", state: "SCHEDULED", loc: "Downtown", locId: "dt",
    title: "Free Kids' Dental Day", summary: "Bring the family for free screenings, goodie bags, and a tour of our new pediatric suite.",
    cta: "Learn more", scheduleTime: "Jun 28, 2026 · 10:00 AM", eventStart: "Jul 12", eventEnd: "Jul 12",
    views: 0, clicks: 0, media: true, hue: 152 },
  { id: "p3", topicType: "STANDARD", state: "DRAFT", loc: "Westpark", locId: "wp",
    title: "Meet Dr. Haddad", summary: "Our Westpark lead dentist on gentle care and why he switched to digital impressions. A quick hello from the team.",
    cta: "Learn more", views: 0, clicks: 0, media: false, hue: 152, aiGenerated: true },
  { id: "p4", topicType: "STANDARD", state: "LIVE", loc: "Downtown", locId: "dt",
    title: "Now offering same-day crowns", summary: "Skip the second visit. Our CEREC scanner mills your crown in-office in about an hour.",
    cta: "Book now", publishTime: "Jun 10, 2026", views: 2180, clicks: 142, media: true, hue: 188 },
  { id: "p5", topicType: "STANDARD", state: "PENDING", loc: "Westpark", locId: "wp",
    title: "We're hiring a hygienist", summary: "Join a warm, modern Westpark practice. Competitive pay, full benefits, and a team that runs on time.",
    cta: "Learn more", publishTime: "submitted 2h ago", views: 0, clicks: 0, media: false, hue: 152 },
];
const POST_TYPES = [
  { key: "STANDARD", label: "Update", icon: "megaphone", desc: "A general announcement or news post." },
  { key: "EVENT", label: "Event", icon: "calendar", desc: "Promote a dated event with start/end times." },
  { key: "OFFER", label: "Offer", icon: "gift", desc: "A coupon or deal with a code and terms." },
];
const POST_CTAS = ["Book now", "Order online", "Learn more", "Sign up", "Call now", "Redeem online"];

/* scheduler — upcoming queue */
const GBP_SCHEDULE = [
  { id: "p2", date: "2026-06-28", title: "Free Kids' Dental Day", topicType: "EVENT", loc: "Downtown", time: "10:00 AM" },
  { id: "s2", date: "2026-07-02", title: "July whitening special", topicType: "OFFER", loc: "All locations", time: "9:00 AM" },
  { id: "s3", date: "2026-07-09", title: "Patient story: Maria's smile", topicType: "STANDARD", loc: "Westpark", time: "2:00 PM" },
  { id: "s4", date: "2026-07-16", title: "Summer hours reminder", topicType: "STANDARD", loc: "All locations", time: "8:30 AM" },
];

/* ---------- Local SEO audit ---------- */
const GBP_AUDIT = {
  score: 78, prevScore: 71,
  categories: [
    { name: "Profile completeness", score: 86, weight: "High", items: [
      { label: "Business description present", ok: true },
      { label: "Primary & additional categories set", ok: true },
      { label: "Services list populated", ok: true },
      { label: "Opening hours incl. special hours", ok: false, fix: "Add holiday hours for July 4" },
      { label: "Attributes (wheelchair, parking) set", ok: false, fix: "12 attributes unset on 2 profiles" },
    ]},
    { name: "Reviews & ratings", score: 74, weight: "High", items: [
      { label: "Average rating ≥ 4.0", ok: true },
      { label: "Reply rate ≥ 90%", ok: false, fix: "Northbridge reply rate is 61%" },
      { label: "Steady review velocity (30d)", ok: true },
      { label: "No unaddressed 1–2★ in 7 days", ok: false, fix: "2 negative reviews need a reply" },
    ]},
    { name: "Photos & media", score: 68, weight: "Medium", items: [
      { label: "≥ 10 photos per location", ok: true },
      { label: "Logo & cover set", ok: true },
      { label: "Fresh photo in last 30 days", ok: false, fix: "Northbridge has no photo in 90 days" },
      { label: "Interior + team photos present", ok: true },
    ]},
    { name: "Posts & freshness", score: 82, weight: "Medium", items: [
      { label: "Posted in last 7 days", ok: true },
      { label: "Active offer running", ok: true },
      { label: "Event posted this month", ok: false, fix: "No live event at Westpark or Northbridge" },
    ]},
    { name: "NAP consistency", score: 90, weight: "High", items: [
      { label: "Name matches across citations", ok: true },
      { label: "Address matches", ok: true },
      { label: "Phone matches", ok: true },
      { label: "Website resolves & matches", ok: true },
    ]},
  ],
};

/* ---------- Tasks ---------- */
const GBP_TASKS = [
  { id: "t1", title: "Reply to Lena Fischer's 1★ review", type: "review", priority: "high", loc: "Northbridge", due: "Today", done: false, source: "audit" },
  { id: "t2", title: "Reply to Dani Okafor's 2★ review", type: "review", priority: "high", loc: "Northbridge", due: "Today", done: false, source: "audit" },
  { id: "t3", title: "Add holiday hours for July 4", type: "profile", priority: "medium", loc: "All locations", due: "Jun 30", done: false, source: "audit" },
  { id: "t4", title: "Upload fresh photos to Northbridge", type: "media", priority: "medium", loc: "Northbridge", due: "Jul 2", done: false, source: "audit" },
  { id: "t5", title: "Verify Northbridge profile", type: "profile", priority: "high", loc: "Northbridge", due: "Overdue", done: false, source: "system" },
  { id: "t6", title: "Approve scheduled 'Kids' Dental Day' event", type: "post", priority: "low", loc: "Downtown", due: "Jun 27", done: false, source: "system" },
  { id: "t7", title: "Set wheelchair-access attributes", type: "profile", priority: "low", loc: "Westpark", due: "Jul 5", done: true, source: "audit" },
  { id: "t8", title: "Schedule July whitening offer", type: "post", priority: "medium", loc: "All locations", due: "Done", done: true, source: "user" },
];

/* status presentation helpers */
const POST_STATE_META = {
  LIVE: { label: "Live", cls: "badge-success", dot: "var(--success)" },
  SCHEDULED: { label: "Scheduled", cls: "badge-accent", dot: "var(--accent)" },
  DRAFT: { label: "Draft", cls: "badge-neutral", dot: "var(--ink-400)" },
  PENDING: { label: "Pending review", cls: "badge-warning", dot: "var(--warning)" },
  REJECTED: { label: "Rejected", cls: "badge-danger", dot: "var(--danger)" },
};
const PRIORITY_META = {
  high: { label: "High", cls: "badge-danger" },
  medium: { label: "Medium", cls: "badge-warning" },
  low: { label: "Low", cls: "badge-neutral" },
};

Object.assign(window, {
  GBP_CONNECTION, GBP_LOCATIONS, GBP_ALL, GBP_METRICS, GBP_TREND, GBP_PERF_SERIES, GBP_ACTIONS,
  GBP_KEYWORDS, GBP_REVIEWS, GBP_REPLY_DRAFTS, AI_TONES, GBP_POSTS, POST_TYPES, POST_CTAS,
  GBP_SCHEDULE, GBP_AUDIT, GBP_TASKS, POST_STATE_META, PRIORITY_META,
});
