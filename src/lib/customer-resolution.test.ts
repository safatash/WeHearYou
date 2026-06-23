import assert from "node:assert/strict";
import test from "node:test";
import { buildIssueChips, GENERAL_ISSUES, CATEGORY_ISSUES } from "./resolution-issues.ts";
import { classifyPriority } from "./resolution-priority.ts";
import { buildRewritePrompt, buildCaseSummaryPrompt, buildResponseDraftPrompt } from "./customer-resolution.ts";
import { summarizeResolutionCases } from "./resolution-analytics.ts";

// ── issue chips ─────────────────────────────────────────────────────────────
test("buildIssueChips returns dental issues + general for a dental business", () => {
  const chips = buildIssueChips("Family Dental");
  assert.deepEqual(chips.slice(0, CATEGORY_ISSUES.dental.length), CATEGORY_ISSUES.dental);
  assert.ok(chips.includes("Other"));
});

test("buildIssueChips falls back to general for unknown category", () => {
  assert.deepEqual(buildIssueChips("Marketing Agency"), GENERAL_ISSUES);
  assert.deepEqual(buildIssueChips(null), GENERAL_ISSUES);
});

test("buildIssueChips de-duplicates overlap (e.g. Billing Concern)", () => {
  const chips = buildIssueChips("Law Firm");
  assert.equal(chips.filter((c) => c === "Billing Concern").length, 1);
});

// ── priority classification ──────────────────────────────────────────────────
test("classifyPriority → CRITICAL for safety/legal/discrimination/fraud", () => {
  assert.equal(classifyPriority({ feedback: "I was injured and ended up in the hospital." }), "CRITICAL");
  assert.equal(classifyPriority({ feedback: "I'm going to sue and contact my attorney." }), "CRITICAL");
  assert.equal(classifyPriority({ feedback: "This was a total scam, I want a chargeback." }), "CRITICAL");
  assert.equal(classifyPriority({ feedback: "The staff were discriminatory toward me." }), "CRITICAL");
});

test("classifyPriority → HIGH for billing, contact requested, or strong frustration", () => {
  assert.equal(classifyPriority({ issueCategories: ["Billing Concern"], feedback: "The charge was wrong." }), "HIGH");
  assert.equal(classifyPriority({ feedback: "Just a small thing.", contactRequested: true }), "HIGH");
  assert.equal(classifyPriority({ feedback: "Worst experience ever, never again." }), "HIGH");
});

test("classifyPriority → MEDIUM for communication/wait/service quality", () => {
  assert.equal(classifyPriority({ issueCategories: ["Poor Communication"], feedback: "Nobody called me back." }), "MEDIUM");
  assert.equal(classifyPriority({ feedback: "The wait was long." }), "MEDIUM");
});

test("classifyPriority → LOW for minor, non-matching feedback", () => {
  assert.equal(classifyPriority({ feedback: "It was just okay, nothing special." }), "LOW");
  assert.equal(classifyPriority({}), "LOW");
});

// ── prompts (compliance) ──────────────────────────────────────────────────────
test("rewrite prompt forbids changing meaning / adding positivity", () => {
  const p = buildRewritePrompt("Nobody called me back and I waited forever.", { issueCategories: ["Poor Communication"] });
  assert.match(p, /Preserve every concern/i);
  assert.match(p, /MUST NOT/);
  assert.match(p, /Add positivity/i);
  assert.match(p, /Nobody called me back/);
});

test("summary prompt includes the structured fields", () => {
  const p = buildCaseSummaryPrompt({
    rating: 2, issueCategories: ["Billing Concern"], feedback: "Charges unclear.",
    requestedOutcome: "Phone call", contactPreference: "PHONE", priority: "HIGH",
  });
  assert.match(p, /Rating: 2 stars/);
  assert.match(p, /Priority: HIGH/);
  assert.match(p, /suggested next step/i);
});

test("response draft prompt forbids liability and guarantees", () => {
  const p = buildResponseDraftPrompt({ businessName: "Acme", customerName: "Jordan Lee", issueCategories: ["Billing Concern"], feedback: "Overcharged." });
  assert.match(p, /Acme/);
  assert.match(p, /Jordan/);
  assert.match(p, /MUST NOT/);
  assert.match(p, /liability/i);
  assert.match(p, /guarantees/i);
});

// ── analytics ─────────────────────────────────────────────────────────────────
test("summarizeResolutionCases computes counts and rates", () => {
  const s = summarizeResolutionCases([
    { status: "NEW", priority: "HIGH", rating: 2, contactPreference: "PHONE" },
    { status: "RESOLVED", priority: "CRITICAL", rating: 1, contactPreference: "EMAIL" },
    { status: "CLOSED", priority: "LOW", rating: 3, contactPreference: "NONE" },
    { status: "IN_PROGRESS", priority: "MEDIUM", rating: 2, contactPreference: "NONE" },
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.newCases, 1);
  assert.equal(s.highPriority, 2);
  assert.equal(s.resolved, 2);
  assert.equal(s.contactRequested, 2);
  assert.equal(s.resolutionRate, 0.5);
  assert.equal(s.averageRating, 2);
});

test("summarizeResolutionCases handles empty", () => {
  const s = summarizeResolutionCases([]);
  assert.equal(s.resolutionRate, 0);
  assert.equal(s.averageRating, 0);
});
