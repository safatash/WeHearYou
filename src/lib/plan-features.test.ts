import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyOrganizationAccess,
  organizationHasAccess,
  hasPayingSubscription,
  type OrganizationAccessInput,
} from "./plan-features.ts";

/**
 * Trial-expiry enforcement.
 *
 * The bug these guard against: the trial check lived in a wrapper that the
 * primary page guard did not call, so an expired organization saw a "trial
 * ended" banner while keeping full access to every protected route. Enforcement
 * now runs inside getCurrentMembership and reads this classifier, so these tests
 * pin the rule that decides it.
 */

const NOW = new Date("2026-08-07T12:00:00.000Z");
const day = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

function org(over: Partial<OrganizationAccessInput> = {}): OrganizationAccessInput {
  return { suspendedAt: null, trialEndsAt: day(7), stripeSubscriptionStatus: null, ...over };
}

/* ─── the trial window ────────────────────────────────────────────────────── */

test("an organization is active before the trial ends", () => {
  assert.equal(classifyOrganizationAccess(org({ trialEndsAt: day(7) }), NOW), "ACTIVE");
  assert.equal(classifyOrganizationAccess(org({ trialEndsAt: day(1) }), NOW), "ACTIVE");
  // One second remaining still counts.
  assert.equal(
    classifyOrganizationAccess(org({ trialEndsAt: new Date(NOW.getTime() + 1000) }), NOW),
    "ACTIVE",
  );
});

test("access is blocked exactly when the trial expires", () => {
  // At the boundary the trial is over — not one tick later.
  assert.equal(classifyOrganizationAccess(org({ trialEndsAt: NOW }), NOW), "TRIAL_EXPIRED");
  assert.equal(
    classifyOrganizationAccess(org({ trialEndsAt: new Date(NOW.getTime() - 1) }), NOW),
    "TRIAL_EXPIRED",
  );
  assert.equal(classifyOrganizationAccess(org({ trialEndsAt: day(-1) }), NOW), "TRIAL_EXPIRED");
});

test("a full 14-day trial runs its course and then blocks", () => {
  const signup = new Date("2026-08-01T09:00:00.000Z");
  const trialEndsAt = new Date(signup.getTime() + 14 * 24 * 60 * 60 * 1000);
  const dayN = (n: number) => new Date(signup.getTime() + n * 24 * 60 * 60 * 1000);

  for (const d of [0, 1, 7, 13]) {
    assert.equal(classifyOrganizationAccess(org({ trialEndsAt }), dayN(d)), "ACTIVE", `day ${d}`);
  }
  assert.equal(classifyOrganizationAccess(org({ trialEndsAt }), dayN(14)), "TRIAL_EXPIRED");
  assert.equal(classifyOrganizationAccess(org({ trialEndsAt }), dayN(15)), "TRIAL_EXPIRED");
});

/* ─── subscriptions restore access ────────────────────────────────────────── */

test("an active or trialing subscription restores access after the trial date", () => {
  const expired = { trialEndsAt: day(-30) };
  assert.equal(classifyOrganizationAccess(org({ ...expired, stripeSubscriptionStatus: "active" }), NOW), "ACTIVE");
  assert.equal(classifyOrganizationAccess(org({ ...expired, stripeSubscriptionStatus: "trialing" }), NOW), "ACTIVE");
});

test("a subscription that is not paying does not restore access", () => {
  const expired = { trialEndsAt: day(-30) };
  for (const status of ["past_due", "canceled", "incomplete", "incomplete_expired", "unpaid", "paused", "", null]) {
    assert.equal(
      classifyOrganizationAccess(org({ ...expired, stripeSubscriptionStatus: status }), NOW),
      "TRIAL_EXPIRED",
      `status: ${String(status)}`,
    );
  }
});

test("subscription status matching is case- and whitespace-insensitive", () => {
  assert.equal(hasPayingSubscription("ACTIVE"), true);
  assert.equal(hasPayingSubscription(" Trialing "), true);
  assert.equal(hasPayingSubscription("Past_Due"), false);
  assert.equal(hasPayingSubscription(null), false);
  assert.equal(hasPayingSubscription(undefined), false);
});

/* ─── recorded suspension wins ────────────────────────────────────────────── */

test("a recorded suspension always blocks, even with an active subscription", () => {
  // An admin suspending an account must not be silently undone by billing state.
  assert.equal(
    classifyOrganizationAccess(
      org({ suspendedAt: day(-2), stripeSubscriptionStatus: "active", trialEndsAt: day(30) }),
      NOW,
    ),
    "SUSPENDED",
  );
});

test("a suspension is reported as SUSPENDED, not TRIAL_EXPIRED", () => {
  // The two states are handled differently: TRIAL_EXPIRED persists a suspension
  // on first detection, SUSPENDED needs no write. Conflating them would rewrite
  // suspendedAt on every request.
  assert.equal(
    classifyOrganizationAccess(org({ suspendedAt: day(-1), trialEndsAt: day(-10) }), NOW),
    "SUSPENDED",
  );
});

/* ─── legacy organizations ────────────────────────────────────────────────── */

test("legacy organizations without a trial date remain accessible", () => {
  // Orgs created before trials existed have no trialEndsAt; a missing field must
  // not read as "expired".
  assert.equal(classifyOrganizationAccess(org({ trialEndsAt: null }), NOW), "ACTIVE");
  assert.equal(classifyOrganizationAccess({ trialEndsAt: null }, NOW), "ACTIVE");
  assert.equal(classifyOrganizationAccess({}, NOW), "ACTIVE");
});

/* ─── purity and the convenience predicate ────────────────────────────────── */

test("the classifier is pure — same input, same answer, no mutation", () => {
  const input = org({ trialEndsAt: day(-1) });
  const snapshot = JSON.stringify(input);
  assert.equal(classifyOrganizationAccess(input, NOW), "TRIAL_EXPIRED");
  assert.equal(classifyOrganizationAccess(input, NOW), "TRIAL_EXPIRED");
  assert.equal(JSON.stringify(input), snapshot, "input must not be mutated");
});

test("organizationHasAccess agrees with the classifier", () => {
  assert.equal(organizationHasAccess(org({ trialEndsAt: day(3) }), NOW), true);
  assert.equal(organizationHasAccess(org({ trialEndsAt: day(-3) }), NOW), false);
  assert.equal(organizationHasAccess(org({ suspendedAt: day(-1) }), NOW), false);
});

/* ─── the wiring the bug was actually in ──────────────────────────────────── */

test("enforcement lives in getCurrentMembership, not a bypassable wrapper", async () => {
  const { readFileSync } = await import("node:fs");
  const authz = readFileSync(new URL("./authz.ts", import.meta.url), "utf8");

  const fn = authz.slice(authz.indexOf("export async function getCurrentMembership"));
  assert.match(fn, /classifyOrganizationAccess\(membership\.organization\)/);
  assert.match(fn, /redirect\("\/suspended"\)/);
  assert.match(fn, /suspendedAt: new Date\(\)/, "an expired trial must be persisted");
});

test("the page guard propagates the option instead of calling the raw lookup", async () => {
  const { readFileSync } = await import("node:fs");
  const guards = readFileSync(new URL("./page-guards.ts", import.meta.url), "utf8");
  assert.match(guards, /requireActiveMembershipPage\(options: MembershipOptions = \{\}\)/);
  assert.match(guards, /getCurrentMembership\(options\)/);
});

test("every renewal path opts out of enforcement, or the org cannot pay", async () => {
  const { readFileSync } = await import("node:fs");
  for (const rel of [
    "../app/billing/page.tsx",
    "../app/suspended/page.tsx",
    "../app/api/billing/create-checkout/route.ts",
    "../app/api/billing/portal/route.ts",
    // The shell renders on /billing; enforcing there would bounce the org off it.
    "../components/app-shell.tsx",
  ]) {
    const src = readFileSync(new URL(rel, import.meta.url), "utf8");
    assert.match(src, /allowSuspended: true/, `${rel} must allow a suspended org through`);
  }
});
