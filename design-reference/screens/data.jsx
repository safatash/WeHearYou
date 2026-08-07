/* WeHearYou — mock data */

const LOCATIONS = [
  { id: "dt", name: "Bright Smile Dental", area: "Downtown", rating: 4.6, reviews: 1284, status: "healthy",
    address: "210 Market St, Suite 400", city: "San Francisco, CA 94103", manager: "Dr. Elena Lin", phone: "(415) 555-0142",
    responseRate: 96, pending: 2, newThisMonth: 84, deltaRating: 0.2, hours: "Open · closes 6 PM",
    sources: ["Google", "Facebook", "Yelp", "Trustpilot"], gbpConnected: true, spark: [4.3,4.4,4.4,4.5,4.5,4.5,4.6,4.6,4.6,4.6,4.6,4.7], hue: 188 },
  { id: "wp", name: "Bright Smile Dental", area: "Westpark", rating: 4.3, reviews: 642, status: "healthy",
    address: "88 Parkway Blvd", city: "San Jose, CA 95110", manager: "Dr. Omar Haddad", phone: "(408) 555-0177",
    responseRate: 88, pending: 3, newThisMonth: 41, deltaRating: 0.1, hours: "Open · closes 5 PM",
    sources: ["Google", "Facebook", "Yelp"], gbpConnected: true, spark: [4.1,4.2,4.2,4.2,4.3,4.3,4.3,4.3,4.4,4.3,4.3,4.3], hue: 152 },
  { id: "nb", name: "Bright Smile Dental", area: "Northbridge", rating: 3.9, reviews: 318, status: "attention",
    address: "1400 North Bridge Ave", city: "Oakland, CA 94607", manager: "Dr. Priya Rao", phone: "(510) 555-0193",
    responseRate: 61, pending: 9, newThisMonth: 22, deltaRating: -0.3, hours: "Closed · opens 9 AM",
    sources: ["Google", "Yelp"], gbpConnected: false, spark: [4.2,4.1,4.1,4.0,4.0,3.9,3.9,4.0,3.9,3.9,3.8,3.9], hue: 24 },
  { id: "all", name: "All locations", area: "3 connected", rating: 4.4, reviews: 2244, status: "healthy" },
];

const METRICS = [
  { key: "reviews", label: "Total reviews", value: "1,284", delta: +8.2, deltaLabel: "vs last 30d", spark: [42,48,46,53,58,55,64,61,72,78,75,84], tone: "up" },
  { key: "rating",  label: "Average rating", value: "4.6", suffix: "★", delta: +0.2, deltaLabel: "vs last 30d", spark: [4.2,4.3,4.3,4.4,4.4,4.5,4.5,4.5,4.6,4.6,4.6,4.6], tone: "up" },
  { key: "response",label: "Response rate", value: "92", suffix: "%", delta: +5.0, deltaLabel: "vs last 30d", spark: [70,72,74,78,80,83,85,86,88,90,91,92], tone: "up" },
  { key: "pending", label: "Pending replies", value: "7", delta: -3, deltaLabel: "since yesterday", spark: [14,13,12,11,12,10,9,9,8,9,8,7], tone: "down-good" },
];

/* rating trend — 12 weeks, dual series (rating avg + volume) */
const TREND = [
  { t: "Mar 17", rating: 4.2, volume: 38 },
  { t: "Mar 24", rating: 4.3, volume: 44 },
  { t: "Mar 31", rating: 4.3, volume: 41 },
  { t: "Apr 7",  rating: 4.4, volume: 52 },
  { t: "Apr 14", rating: 4.4, volume: 49 },
  { t: "Apr 21", rating: 4.5, volume: 58 },
  { t: "Apr 28", rating: 4.5, volume: 63 },
  { t: "May 5",  rating: 4.5, volume: 61 },
  { t: "May 12", rating: 4.6, volume: 72 },
  { t: "May 19", rating: 4.6, volume: 78 },
  { t: "May 26", rating: 4.6, volume: 74 },
  { t: "Jun 2",  rating: 4.7, volume: 84 },
];

const SOURCES = [
  { name: "Google",     value: 712, pct: 55, color: "var(--src-google)" },
  { name: "Facebook",   value: 289, pct: 23, color: "var(--src-facebook)" },
  { name: "Yelp",       value: 178, pct: 14, color: "var(--src-yelp)" },
  { name: "Trustpilot", value: 105, pct: 8,  color: "var(--src-trustpilot)" },
];

const SENTIMENT = [
  { name: "Positive", value: 78, color: "var(--success)" },
  { name: "Neutral",  value: 15, color: "var(--ink-300)" },
  { name: "Negative", value: 7,  color: "var(--danger)" },
];

const CAMPAIGNS = [
  { name: "Post-Visit SMS Follow-up", channel: "SMS", status: "active",  sent: 1840, rate: 31, rating: 4.7 },
  { name: "Email Review Request",      channel: "Email", status: "active", sent: 2210, rate: 18, rating: 4.5 },
  { name: "Cleaning Reminder + Ask",   channel: "SMS", status: "active",  sent: 960,  rate: 27, rating: 4.6 },
  { name: "Win-back (lapsed)",         channel: "Email", status: "paused", sent: 430,  rate: 9,  rating: 4.1 },
];

const REVIEWS = [
  { id: 1, name: "Marcus Webb", source: "Google", rating: 5, time: "12m ago", status: "pending", loc: "Downtown",
    text: "Dr. Lin and the whole team were incredible. I came in nervous about a root canal and left genuinely impressed — painless, fast, and they explained every step. Best dental experience I've had." },
  { id: 2, name: "Priya Anand", source: "Facebook", rating: 4, time: "1h ago", status: "pending", loc: "Westpark",
    text: "Great hygienist and a clean, modern office. Only reason it's not 5 stars is the wait — I was about 20 minutes past my appointment time. Otherwise really happy with the care." },
  { id: 3, name: "Dani Okafor", source: "Google", rating: 2, time: "3h ago", status: "pending", loc: "Northbridge",
    text: "Front desk mixed up my insurance and I got billed for something that should've been covered. The dentist was fine but the admin side needs work." },
  { id: 4, name: "Sara Mendel", source: "Yelp", rating: 5, time: "5h ago", status: "responded", loc: "Downtown",
    text: "Booked online in two minutes and got a reminder text the day before. Whole thing was seamless. Highly recommend the downtown location." },
  { id: 5, name: "Tom Becker", source: "Google", rating: 5, time: "Yesterday", status: "responded", loc: "Downtown",
    text: "Friendly staff, gorgeous office, and they actually run on time. My kids weren't scared at all which is a small miracle." },
  { id: 6, name: "Lena Fischer", source: "Trustpilot", rating: 4, time: "Yesterday", status: "responded", loc: "Westpark",
    text: "Solid experience overall. Appreciated the transparent pricing up front — no surprise bills, which is rare these days." },
  { id: 7, name: "Jordan Avery", source: "Google", rating: 5, time: "2d ago", status: "responded", loc: "Downtown",
    text: "I've been to a lot of dentists and none made me feel this taken care of. They remembered details about my last visit and checked in afterward." },
  { id: 8, name: "Mara Lindqvist", source: "Facebook", rating: 5, time: "3d ago", status: "responded", loc: "Westpark",
    text: "Genuinely the best in the city. The whole office runs like clockwork and everyone is warm. I actually look forward to my cleanings now." },
  { id: 9, name: "Caleb Nwosu", source: "Google", rating: 5, time: "4d ago", status: "responded", loc: "Downtown",
    text: "Brought my whole family here after one visit. Kids weren't scared, billing was clear, and the care was top-notch." },
  { id: 10, name: "Rosa Iglesias", source: "Yelp", rating: 5, time: "5d ago", status: "responded", loc: "Westpark",
    text: "Switched from a chain practice and the difference is night and day. Personal, unhurried, and genuinely skilled." },
  { id: 11, name: "Henry Caldwell", source: "Trustpilot", rating: 5, time: "1w ago", status: "responded", loc: "Northbridge",
    text: "From the online booking to the follow-up text, every touchpoint felt considered. Highly recommend." },
];

const QUICK_REPLIES = {
  5: "Thank you so much for the kind words! We're thrilled you had a great visit and we'll pass this along to the team. See you at your next appointment! 🦷",
  4: "Thanks for the thoughtful review! We're glad you had a good experience and we're always working to make every visit even smoother.",
  2: "We're sorry about the billing mix-up — that's not the experience we want for you. Our office manager will reach out today to make it right.",
};

/* video testimonials — recorded by customers via a WeHearYou recording link (hosted on WeHearYou only) */
const VIDEO_LOCATIONS = ["NOVA Advertising — Fairfax, VA", "NOVA Advertising — Arlington, VA", "NOVA Advertising — Reston, VA"];
const DEFAULT_PROMPT = "How has NOVA Advertising helped you?";
const VIDEOS = [
  { id: "v1", name: "Safa", loc: "NOVA Advertising · Fairfax, VA", date: "6/5/2026", length: "0:22", status: "published", autoThumb: true, hue: 24, prompt: "How has NOVA Advertising helped you?", quote: "We love NOVA Advertising — they doubled our leads in a quarter.", transcript: "Working with NOVA completely changed how we approach marketing. In one quarter our qualified leads doubled, and the team kept us in the loop every step of the way." },
  { id: "v2", name: "Daniel Cho", loc: "NOVA Advertising · Arlington, VA", date: "6/2/2026", length: "1:12", status: "published", autoThumb: false, hue: 262, prompt: "What results have you seen?", quote: "Best agency partnership we've ever had, hands down.", transcript: "From the first call they understood our market. The reporting is transparent and the ROI speaks for itself." },
  { id: "v3", name: "Maya Okonkwo", loc: "NOVA Advertising · Fairfax, VA", date: "5/28/2026", length: "0:36", status: "review", autoThumb: true, hue: 152, prompt: "How has NOVA Advertising helped you?", quote: "They explained the whole strategy step by step — no jargon.", transcript: "As a small business owner I was nervous about ad spend. They walked me through every decision and the plan made sense." },
  { id: "v4", name: "Liam Petrov", loc: "NOVA Advertising · Reston, VA", date: "5/21/2026", length: "0:54", status: "published", autoThumb: true, hue: 210, prompt: "Would you recommend us?", quote: "I recommend NOVA to every founder I meet.", transcript: "The team feels like an extension of our own. Responsive, creative, and genuinely invested in our growth." },
  { id: "v5", name: "Priya Nair", loc: "NOVA Advertising · Arlington, VA", date: "5/14/2026", length: "0:41", status: "review", autoThumb: true, hue: 320, prompt: "How has NOVA Advertising helped you?", quote: "Our cost per lead dropped by half in two months.", transcript: "I'd worked with two agencies before and neither delivered. NOVA cut our cost per lead in half within two months." },
  { id: "v6", name: "Marcus Bell", loc: "NOVA Advertising · Fairfax, VA", date: "5/3/2026", length: "1:03", status: "published", autoThumb: false, hue: 188, prompt: "What stood out to you?", quote: "They moved fast when we needed to pivot a campaign.", transcript: "When the market shifted, NOVA turned a new campaign around in days, not weeks. That responsiveness saved our quarter." },
];

/* AI-generated summary across the review corpus */
const AI_SUMMARY = {
  count: 50,
  text: "Patients consistently praise the team's warm, compassionate care and a welcoming environment where comfort comes first. Many highlight clear explanations, modern technology, and an efficient practice that \u201cruns like a finely tuned machine\u201d \u2014 building lasting trust over years of visits.",
  highlights: ["Compassionate staff", "Clear communication", "Modern technology", "Low wait times"],
};

Object.assign(window, { LOCATIONS, METRICS, TREND, SOURCES, SENTIMENT, CAMPAIGNS, REVIEWS, QUICK_REPLIES, VIDEOS, VIDEO_LOCATIONS, DEFAULT_PROMPT, AI_SUMMARY });
