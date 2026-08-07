import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * Design-system contract tests.
 *
 * The palette carries accessibility obligations that are easy to undo by
 * "just using the brand colour". These pin the contrast maths and the
 * canonical primitives so a future edit fails here rather than in production.
 */

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/* ─── contrast helpers (WCAG 2.1 relative luminance) ──────────────────────── */

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Read a `--token: #hex;` value out of globals.css. */
function token(name: string): string {
  const m = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `--${name} must be defined as a hex literal in globals.css`);
  return m![1].toLowerCase();
}

const WHITE = "#ffffff";
const AA_TEXT = 4.5;
const AA_LARGE = 3.0;

/* ─── the rules that were actually broken ─────────────────────────────────── */

test("solid interactive fill carries white content at AA", () => {
  const fill = token("accent-solid");
  const fg = token("accent-fg");
  const ratio = contrastRatio(fg, fill);
  assert.ok(ratio >= AA_TEXT, `--accent-fg on --accent-solid is ${ratio.toFixed(2)}:1, needs ${AA_TEXT}`);
});

test("hover state stays at AA (a darker hover must not overshoot into mud)", () => {
  const ratio = contrastRatio(token("accent-fg"), token("accent-solid-hover"));
  assert.ok(ratio >= AA_TEXT, `hover fill is ${ratio.toFixed(2)}:1`);
});

test("teal text on light surfaces uses the accessible token, not the brand hue", () => {
  const ink = token("accent-ink");
  assert.ok(
    contrastRatio(ink, WHITE) >= AA_TEXT,
    `--accent-ink on white is ${contrastRatio(ink, WHITE).toFixed(2)}:1`,
  );
  assert.ok(
    contrastRatio(ink, token("accent-soft")) >= AA_TEXT,
    `--accent-ink on --accent-soft is ${contrastRatio(ink, token("accent-soft")).toFixed(2)}:1`,
  );
});

test("the brand hue is documented as failing for white content, so it stays decorative", () => {
  // #37AEB7 with white is 2.66:1. This test exists to make the regression
  // loud if someone points --accent-solid back at --accent.
  const brand = token("accent");
  assert.ok(
    contrastRatio(WHITE, brand) < AA_TEXT,
    "if the brand hue ever passes AA with white, --accent-solid can be retired",
  );
  assert.notEqual(token("accent-solid"), brand, "--accent-solid must not be the raw brand hue");
});

test("btn-primary uses the solid token and the fg token, never a literal", () => {
  const block = CSS.slice(CSS.indexOf(".btn-primary {"), CSS.indexOf(".btn-secondary {"));
  assert.match(block, /background: var\(--accent-solid\)/);
  assert.match(block, /color: var\(--accent-fg\)/);
  assert.ok(!/color:\s*white/.test(block), "use the token, not a literal");
});

test("body text and muted text clear AA on the page canvas", () => {
  const page = token("page");
  for (const name of ["ink-900", "ink-700", "ink-600", "ink-500"]) {
    const ratio = contrastRatio(token(name), page);
    assert.ok(ratio >= AA_TEXT, `--${name} on --page is ${ratio.toFixed(2)}:1`);
  }
});

test("status colours used as text clear AA on white", () => {
  for (const name of ["success-ink", "warning-ink", "danger-ink"]) {
    const ratio = contrastRatio(token(name), WHITE);
    assert.ok(ratio >= AA_TEXT, `--${name} on white is ${ratio.toFixed(2)}:1`);
  }
});

test("badges use the text-role status tokens, not the vivid fills", () => {
  for (const [badge, tok] of [["badge-success", "success-ink"], ["badge-warning", "warning-ink"], ["badge-danger", "danger-ink"]]) {
    const block = CSS.slice(CSS.indexOf(`.${badge} {`), CSS.indexOf(`.${badge} {`) + 200);
    assert.match(block, new RegExp(`color: var\\(--${tok}\\)`), `.${badge} must use --${tok}`);
  }
});

test("the vivid status hues stay non-text (documented, not accidental)", () => {
  // If these ever pass AA the -ink split can be revisited; until then the
  // split is load-bearing.
  for (const name of ["success", "warning"]) {
    assert.ok(contrastRatio(token(name), WHITE) < AA_LARGE, `--${name} unexpectedly passes`);
  }
});

/* ─── canonical primitives exist and stay canonical ───────────────────────── */

test("every canonical primitive is defined", () => {
  for (const cls of [
    ".btn", ".btn-primary", ".btn-secondary", ".btn-ghost", ".btn-danger",
    ".icon-btn", ".nav-item", ".nav-section-label", ".chip",
    ".page-header", ".page-title", ".page-description",
    ".panel", ".card", ".section-title", ".field-value", ".field-label",
    ".empty-state", ".badge", ".eyebrow", ".sr-only",
  ]) {
    assert.ok(CSS.includes(`${cls} {`) || CSS.includes(`${cls},`), `${cls} must exist in globals.css`);
  }
});

test("focus is visible on every interactive primitive", () => {
  const block = CSS.slice(CSS.indexOf(".btn:focus-visible"));
  for (const sel of [".btn:focus-visible", ".nav-item:focus-visible", ".chip:focus-visible", ".icon-btn:focus-visible"]) {
    assert.ok(CSS.includes(sel), `${sel} must have a focus style`);
  }
  assert.match(block, /outline: 2px solid var\(--accent\)/);
  assert.match(block, /outline-offset: 2px/);
});

test("selected state is never signalled by colour alone", () => {
  // The active nav row carries a rail in addition to its tint, so the state
  // survives greyscale, forced-colours and colour-vision deficiency.
  const nav = CSS.slice(CSS.indexOf('.nav-item[aria-current="page"]'));
  assert.match(nav, /\.nav-item\[aria-current="page"\]::before/);
  assert.match(nav, /content: ""/);
});

test("selection is driven by ARIA state, not a class name", () => {
  assert.match(CSS, /\.chip\[aria-pressed="true"\]/);
  assert.match(CSS, /\.chip\[aria-current="true"\]/);
  assert.match(CSS, /\.nav-item\[aria-current="page"\]/);
});

test("icon-only targets meet the 24px minimum with room to spare", () => {
  const block = CSS.slice(CSS.indexOf(".icon-btn {"), CSS.indexOf(".icon-btn:hover"));
  const min = block.match(/min-width:\s*(\d+)px/);
  assert.ok(min && Number(min[1]) >= 24, "icon buttons need a real target size");
  assert.ok(Number(min![1]) >= 40, `got ${min![1]}px, expected at least 40`);
});

test("reduced motion is honoured globally", () => {
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
});

test("disabled and loading states are defined once, centrally", () => {
  assert.match(CSS, /\.btn:disabled,\n\.btn\[aria-disabled="true"\]/);
  assert.match(CSS, /\.btn\[aria-busy="true"\]/);
});

/* ─── the legacy system stays dead ────────────────────────────────────────── */

test("the near-black primary button is not reintroduced in shared components", () => {
  const UI = readFileSync(new URL("../components/ui.tsx", import.meta.url), "utf8");
  const code = UI.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/bg-slate-950/.test(code), "ui.tsx must not carry the legacy dark button");
  assert.ok(!/export function PrimaryButton/.test(code), "PrimaryButton was the legacy black pill");
  assert.ok(!/export function SecondaryButton/.test(code));
});

test("the app shell no longer renders the promotional gradient card", () => {
  const SHELL = readFileSync(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
  assert.ok(!/MotivationBlock/.test(SHELL));
  assert.ok(!/indigo/.test(SHELL), "no indigo in the shell");
  assert.match(SHELL, /<SidebarNav activeScreen=/, "shell must use the canonical nav");
  assert.match(SHELL, /<MobileNav activeScreen=/, "shell must render mobile navigation");
});

test("navigation is reachable below the lg breakpoint", () => {
  const NAV = readFileSync(new URL("../components/sidebar-nav.tsx", import.meta.url), "utf8");
  assert.match(NAV, /export function MobileNav/);
  assert.match(NAV, /aria-modal="true"/);
  assert.match(NAV, /aria-label="Open navigation menu"/);
  assert.match(NAV, /e\.key === "Escape"/, "Escape must dismiss the drawer");
  assert.match(NAV, /aria-current=\{active \? "page" : undefined\}/);
});
