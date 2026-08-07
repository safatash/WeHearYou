/* WeHearYou — icons (Lucide) + shared UI primitives */

/* Map app icon names → Lucide icon names. Keeps the <Icon name="…"/> API unchanged. */
const LUCIDE_NAMES = {
  grid: "LayoutGrid", star: "Star", chat: "MessageCircle", megaphone: "Megaphone",
  bolt: "Zap", pin: "MapPin", plug: "Plug", chart: "LineChart", gear: "Settings",
  search: "Search", bell: "Bell", plus: "Plus", chevDown: "ChevronDown",
  chevRight: "ChevronRight", arrowUp: "ArrowUp", arrowRight: "ArrowRight", arrowDown: "ArrowDown",
  check: "Check", reply: "Reply", sparkle: "Sparkles", filter: "Filter",
  dots: "MoreHorizontal", clock: "Clock", inbox: "Inbox", thumb: "ThumbsUp",
  heart: "Heart", send: "Send", sun: "Sun", logout: "LogOut",
  external: "ExternalLink", flag: "Flag", tag: "Tag", archive: "Archive",
  sliders: "SlidersHorizontal", help: "CircleHelp", widget: "LayoutDashboard",
  copy: "Copy", code: "Code", moon: "Moon", palette: "Palette", eye: "Eye", eyeOff: "EyeOff",
  layers: "Layers", refresh: "RefreshCw", monitor: "Monitor", phone: "Smartphone",
  film: "Film", close: "X", trash: "Trash2",
  users: "Users", mail: "Mail", map: "Map", upload: "Upload", image: "Image",
  link: "Link", funnel: "Filter",
  /* ---- GBP Manager additions ---- */
  calendar: "Calendar", calClock: "CalendarClock", calDays: "CalendarDays",
  edit: "SquarePen", pencil: "Pencil", barChart: "ChartColumn", target: "Target",
  checkCircle: "CircleCheck", alert: "TriangleAlert", globe: "Globe",
  shield: "ShieldCheck", listChecks: "ListChecks", clipboard: "ClipboardList",
  fileText: "FileText", building: "Building2", trending: "TrendingUp",
  navigation: "Navigation", camera: "Camera", lightbulb: "Lightbulb",
  info: "Info", arrowUpRight: "ArrowUpRight", pause: "Pause", play: "Play",
  lock: "Lock", google: "Chrome", store: "Store", gift: "Gift",
  ticket: "Ticket", zap: "Zap", history: "History", undo: "Undo2",
  messageSquare: "MessageSquare", phoneCall: "PhoneCall", award: "Award",
};

/* Resolve a Lucide icon's child nodes. Lucide stores each icon as
   ["svg", attrs, [ [tag, attrs], … ]] — we want that children array (index 2). */
const lucideNode = (pascal) => {
  const L = (typeof window !== "undefined" && window.lucide) || {};
  const reg = L.icons || L;
  const entry = reg[pascal] || (pascal === "CircleHelp" ? reg.HelpCircle : null);
  if (!entry) return null;
  return Array.isArray(entry[2]) ? entry[2] : (Array.isArray(entry) ? entry : null);
};

const Icon = ({ name, size = 18, stroke = 1.6, className = "", style = {} }) => {
  const node = lucideNode(LUCIDE_NAMES[name] || name);
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      className={`ic ${className}`} style={style} aria-hidden="true">
      {Array.isArray(node)
        ? node.map((child, i) => React.createElement(child[0], { key: i, ...child[1] }))
        : null}
    </svg>
  );
};

/* Star rating display */
const Stars = ({ value = 0, size = 14, gap = 1.5 }) => {
  const full = Math.floor(value);
  const frac = value - full;
  return (
    <span style={{ display: "inline-flex", gap }}>
      {[0,1,2,3,4].map(i => {
        const fill = i < full ? 1 : (i === full ? frac : 0);
        return (
          <span key={i} style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
            <svg viewBox="0 0 24 24" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
              <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill="#e6e6ea"/>
            </svg>
            <span style={{ position: "absolute", inset: 0, width: `${fill*100}%`, overflow: "hidden" }}>
              <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
                <path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.78L12 17.9l-5.2 2.73 1-5.78-4.2-4.1 5.8-.85z" fill="var(--star)"/>
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
};

/* Source badge with brand dot */
const SOURCE_META = {
  WeHearYou:  { color: "#4f46e5",              letter: "W" },
  Google:     { color: "var(--src-google)",   letter: "G" },
  Facebook:   { color: "var(--src-facebook)", letter: "f" },
  Yelp:       { color: "var(--src-yelp)",     letter: "Y" },
  Trustpilot: { color: "var(--src-trustpilot)", letter: "T" },
};
const SourceTag = ({ source, showLabel = true }) => {
  const m = SOURCE_META[source] || { color: "var(--ink-400)", letter: "?" };
  return (
    <span className="badge badge-neutral" style={{ paddingLeft: 6 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: m.color, color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 9.5, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{m.letter}</span>
      {showLabel && source}
    </span>
  );
};

/* Avatar with deterministic color from name */
const AV_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];
const Avatar = ({ name = "", size = 34, src = null }) => {
  const initials = name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const ci = name.split("").reduce((a,c) => a + c.charCodeAt(0), 0) % AV_COLORS.length;
  const c = AV_COLORS[ci];
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", flex: "none",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: `color-mix(in srgb, ${c} 16%, #fff)`, color: c,
      fontSize: size*0.36, fontWeight: 680, letterSpacing: "-.02em",
      border: `1px solid color-mix(in srgb, ${c} 22%, #fff)` }}>
      {initials}
    </span>
  );
};

/* Tiny sparkline */
const Sparkline = ({ data = [], w = 96, h = 30, color = "var(--accent)", fill = true }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((d, i) => [ (i/(data.length-1))*w, h - 4 - ((d-min)/rng)*(h-8) ]);
  const line = pts.map((p,i) => `${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = "sg" + Math.random().toString(36).slice(2,7);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.18"/>
          <stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.4" fill={color}/>
    </svg>
  );
};

Object.assign(window, { Icon, Stars, SourceTag, SOURCE_META, Avatar, Sparkline });
