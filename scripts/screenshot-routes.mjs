/**
 * Authenticated route screenshots for design review.
 *
 * Boots the dev server, mints a NextAuth session cookie from AUTH_SECRET (no
 * password is read or typed), then captures each route at desktop, tablet and
 * mobile widths.
 *
 * ⚠ THE OUTPUT CONTAINS REAL CUSTOMER DATA.
 *
 * This repo's DATABASE_URL points at the production Neon database, so every
 * screenshot will show real contacts, reviews, phone numbers and email
 * addresses. Output goes to `.screenshots/` which is gitignored — never commit
 * it, never paste it anywhere public. The run is opt-in for that reason: it
 * refuses to start unless SCREENSHOT_USER_EMAIL names the account whose session
 * you intend to borrow.
 *
 * Read-only: only GETs are issued, no forms are submitted, no actions fired.
 *
 *   SCREENSHOT_USER_EMAIL=you@example.com node scripts/screenshot-routes.mjs
 *   SCREENSHOT_USER_EMAIL=... node scripts/screenshot-routes.mjs --only widgets,contacts
 *   SCREENSHOT_USER_EMAIL=... BASE_URL=http://localhost:3000 node scripts/screenshot-routes.mjs
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ─── routes ──────────────────────────────────────────────────────────────────
   `ref` names the layout in design-reference/screens to compare against, so a
   reviewer can put the two side by side. */
const ROUTES = [
  { id: "dashboard", path: "/", ref: "dashboard.jsx" },
  { id: "contacts", path: "/contacts", ref: "contacts.jsx" },
  { id: "contacts-new", path: "/contacts/new", ref: "contacts.jsx" },
  { id: "locations", path: "/locations", ref: "locations.jsx" },
  { id: "reviews", path: "/reviews", ref: "gbp-reviews.jsx" },
  { id: "campaigns", path: "/campaigns", ref: "wizard.jsx" },
  { id: "campaigns-new", path: "/campaigns/new", ref: "wizard.jsx" },
  { id: "widgets", path: "/widgets", ref: "widgets.jsx" },
  { id: "review-links", path: "/review-links", ref: "review-links.jsx" },
  { id: "video-testimonials", path: "/video-testimonials", ref: "video-testimonials.jsx" },
  { id: "gbp", path: "/gbp", ref: "gbp-dashboard.jsx" },
  { id: "gbp-posts", path: "/gbp/posts", ref: "gbp-posts.jsx" },
  { id: "gbp-photos", path: "/gbp/photos", ref: "gbp-dashboard.jsx" },
  { id: "customer-resolution", path: "/customer-resolution", ref: null },
  { id: "automation", path: "/automation", ref: null },
  { id: "analytics", path: "/analytics", ref: "charts.jsx" },
  { id: "team", path: "/team", ref: null },
  { id: "settings", path: "/settings", ref: null },
  { id: "billing", path: "/billing", ref: null },
  { id: "integrations", path: "/integrations", ref: null },
];

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "tablet", width: 834, height: 1112 },
  { id: "mobile", width: 390, height: 844 },
];

/* ─── env ─────────────────────────────────────────────────────────────────── */

function readEnvFile() {
  const out = {};
  for (const file of [".env.local", ".env"]) {
    const p = path.join(ROOT, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      if (out[m[1]] === undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return out;
}

const fileEnv = readEnvFile();
const AUTH_SECRET = process.env.AUTH_SECRET || fileEnv.AUTH_SECRET;
const USER_EMAIL = process.env.SCREENSHOT_USER_EMAIL;

if (!USER_EMAIL) {
  console.error(
    "\nSCREENSHOT_USER_EMAIL is required.\n\n" +
      "This borrows a real account's session against the PRODUCTION database, so\n" +
      "the screenshots will contain real customer data. Name the account explicitly:\n\n" +
      "  SCREENSHOT_USER_EMAIL=you@example.com node scripts/screenshot-routes.mjs\n",
  );
  process.exit(1);
}
if (!AUTH_SECRET) {
  console.error("AUTH_SECRET not found in the environment or .env — cannot mint a session.");
  process.exit(1);
}

const only = (() => {
  const i = process.argv.indexOf("--only");
  return i === -1 ? null : new Set(process.argv[i + 1].split(","));
})();
const routes = only ? ROUTES.filter((r) => only.has(r.id)) : ROUTES;

/* ─── resolve the user without a password ─────────────────────────────────── */

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({
  where: { email: USER_EMAIL.toLowerCase() },
  select: { id: true, email: true, name: true },
});
await prisma.$disconnect();

if (!user) {
  console.error(`No user with email ${USER_EMAIL}.`);
  process.exit(1);
}

/* ─── mint the session cookie ─────────────────────────────────────────────── */
// next-auth v5 encrypts the JWT; salt is the cookie name.
const { encode } = await import("@auth/core/jwt");
const COOKIE = "authjs.session-token";
const sessionToken = await encode({
  token: { sub: user.id, email: user.email, name: user.name },
  secret: AUTH_SECRET,
  salt: COOKIE,
  maxAge: 60 * 60,
});

/* ─── dev server ──────────────────────────────────────────────────────────── */

const PORT = process.env.PORT || 3111;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
let server = null;

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

if (!process.env.BASE_URL) {
  console.log(`Starting dev server on ${PORT}…`);
  server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  server.stdout.on("data", (d) => {
    const s = d.toString();
    if (/error/i.test(s)) process.stderr.write(s);
  });
  if (!(await waitForServer(BASE_URL))) {
    console.error("Dev server did not come up in time.");
    server.kill();
    process.exit(1);
  }
}

/* ─── capture ─────────────────────────────────────────────────────────────── */

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
const outDir = path.join(ROOT, ".screenshots", stamp);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const results = [];

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    await context.addCookies([
      { name: COOKIE, value: sessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
    ]);

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));

      let status = "ok";
      try {
        const res = await page.goto(BASE_URL + route.path, { waitUntil: "networkidle", timeout: 45_000 });
        if (res && res.status() >= 400) status = `http ${res.status()}`;
        if (page.url().includes("/login")) status = "redirected to login";
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(outDir, `${route.id}--${vp.id}.png`), fullPage: true });
      } catch (e) {
        status = `error: ${String(e.message).split("\n")[0].slice(0, 90)}`;
      }

      // Cheap in-page checks that only a rendered route can answer.
      let audit = {};
      if (status === "ok") {
        audit = await page.evaluate(() => {
          const legacy = document.querySelectorAll('[class*="slate-"],[class*="indigo-"]').length;
          const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
          // ★ and ✓ are canonical typographic marks in the design system
          // (foundations.jsx uses "4.6★"); everything else in these ranges is a
          // colour emoji that has no place in production UI.
          const emojiMatches = (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu) || [])
            .filter((c) => !"\u2605\u2606\u2713\u2714\u2192\u2190".includes(c));
          const emoji = emojiMatches.length > 0 ? [...new Set(emojiMatches)].join("") : null;
          return { legacyClassNodes: legacy, horizontalOverflow, emoji };
        });
      }

      results.push({ route: route.id, viewport: vp.id, status, ref: route.ref, ...audit, consoleErrors: consoleErrors.length });
      const flag = status !== "ok" ? "✖" : audit.horizontalOverflow ? "⚠" : "✔";
      console.log(
        `${flag} ${route.id.padEnd(22)} ${vp.id.padEnd(8)} ${status}` +
          (audit.horizontalOverflow ? "  H-OVERFLOW" : "") +
          (audit.emoji ? `  EMOJI ${audit.emoji}` : "") +
          (consoleErrors.length ? `  ${consoleErrors.length} console error(s)` : ""),
      );
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  if (server) server.kill();
}

/* ─── summary ─────────────────────────────────────────────────────────────── */

const failed = results.filter((r) => r.status !== "ok");
const overflow = results.filter((r) => r.horizontalOverflow);
const withEmoji = [...new Set(results.filter((r) => r.emoji).map((r) => `${r.route} ${r.emoji}`))];
const withLegacy = [...new Set(results.filter((r) => (r.legacyClassNodes ?? 0) > 0).map((r) => r.route))];

console.log(`\n${results.length - failed.length}/${results.length} captured → ${path.relative(ROOT, outDir)}`);
if (failed.length) console.log(`\n${failed.length} failed:\n` + failed.map((f) => `  ${f.route} (${f.viewport}): ${f.status}`).join("\n"));
if (overflow.length) console.log(`\nHorizontal overflow:\n` + overflow.map((f) => `  ${f.route} @ ${f.viewport}`).join("\n"));
if (withEmoji.length) console.log(`\nEmoji still in UI text: ${withEmoji.join(", ")}`);
if (withLegacy.length) console.log(`\nStill carrying legacy class names: ${withLegacy.join(", ")}`);

console.log("\n⚠ .screenshots/ contains real customer data. Gitignored — do not commit or share.");
process.exit(failed.length ? 1 : 0);
