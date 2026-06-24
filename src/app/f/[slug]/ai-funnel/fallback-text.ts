export interface FunnelBusiness {
  name: string;
  location: string;
}

const joinNice = (arr: string[]): string =>
  arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];

const capitalize = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export function buildReview(
  { chips, service, helper, extra }: { chips: string[]; service: string; helper: string; extra: string },
  biz: FunnelBusiness,
  variant: "short" | "detailed" = "detailed",
  tone: "balanced" | "casual" | "professional" = "balanced"
): string {
  const lc = chips.map(c => c.toLowerCase());
  const has = (s: string) => lc.some(c => c.includes(s));
  const svc = service ? service.toLowerCase() : "work";
  const who = helper ? `${helper} and the team` : "the team";

  if (variant === "short") {
    let s = `Fantastic experience with ${biz.name}`;
    if (service) s += ` for our ${svc}`;
    s += ". ";
    const pts: string[] = [];
    if (has("design")) pts.push("the website design was excellent");
    if (has("seo") || has("rank") || has("result")) pts.push("we've already seen real results");
    if (has("communication") || has("knowledge")) pts.push("communication was clear throughout");
    if (!pts.length) pts.push("the whole process was easy");
    s += capitalize(joinNice(pts)) + ". ";
    if (has("recommend")) s += "Highly recommend!";
    else s += `${who.charAt(0).toUpperCase() + who.slice(1)} made it easy.`;
    return s;
  }

  // detailed
  const open = tone === "casual"
    ? `Honestly, such a great experience with ${biz.name}!`
    : tone === "professional"
      ? `I had an excellent experience working with ${biz.name}.`
      : `I had a fantastic experience with ${biz.name}!`;
  let body = ` From the very beginning${has("easy") ? ", the whole process was so easy" : ""}, `;
  if (helper) body += `${helper} `;
  body += `${who === helper + " and the team" ? "and the team " : ""}`;
  const mids: string[] = [];
  if (has("design")) mids.push("I was especially impressed with the great website design");
  if (service && !has("design")) mids.push(`their ${svc} work was exactly what we needed`);
  if (has("communication")) mids.push("everything was communicated clearly and simply");
  if (has("professional") || has("knowledge")) mids.push("the team was professional and really knew their stuff");
  if (mids.length) body += capitalize(joinNice(mids)) + ". ";
  else body += "they made everything clear and simple. ";
  if (has("seo") || has("rank") || has("result")) {
    body += `Since partnering with them, I've genuinely seen improved SEO and rankings, which is exactly what I was hoping for. `;
  }
  if (extra) body += extra.trim().replace(/\.?$/, ". ");
  body += has("recommend")
    ? `I highly recommend ${biz.name} to anyone looking to enhance their online presence and get real results.`
    : `If you're in ${biz.location} and want a team that delivers, give them a look.`;
  return open + body;
}

export function clarifyFeedback(text: string, issues: string[], biz: FunnelBusiness): string {
  if (!text || !text.trim()) {
    return `My recent experience with ${biz.name} fell short of what I expected${issues.length ? ", mainly around " + joinNice(issues.map(i => i.toLowerCase())) : ""}. I'd appreciate the chance to have this looked into.`;
  }
  const lead = issues.length ? `I want to share feedback about ${joinNice(issues.map(i => i.toLowerCase()))}. ` : "";
  const tidy = text.trim().replace(/\s+/g, " ");
  const ended = /[.!?]$/.test(tidy) ? tidy : tidy + ".";
  return lead + capitalize(ended) + " I'm sharing this so it can be addressed and improved going forward.";
}
