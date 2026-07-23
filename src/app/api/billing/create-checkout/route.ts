import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/authz";
import { canManageBilling } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { PLANS, isPlanId } from "@/lib/plans";
import type { TeamMemberWithRelations } from "@/lib/team";

export const dynamic = "force-dynamic";

function baseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }
  const stripe = getStripe();

  const membership = (await getCurrentMembership()) as TeamMemberWithRelations | null;
  if (!membership) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!canManageBilling(membership)) {
    return NextResponse.json({ error: "You do not have permission to manage billing." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { planId?: string };
  if (!isPlanId(body.planId)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  const plan = PLANS[body.planId];
  if (!plan.stripePriceId) {
    return NextResponse.json({ error: `No Stripe price configured for the ${plan.name} plan.` }, { status: 503 });
  }

  const org = membership.organization;

  // ── Path A: org already has an active subscription → upgrade/downgrade in place ──
  if (org.stripeSubscriptionId) {
    const activeStatuses = ["active", "trialing", "past_due"];
    const currentStatus = org.stripeSubscriptionStatus ?? "";

    if (activeStatuses.includes(currentStatus)) {
      // Retrieve the subscription to find the current subscription item ID
      const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
      const itemId = subscription.items.data[0]?.id;

      if (!itemId) {
        return NextResponse.json({ error: "Could not find subscription item to update." }, { status: 500 });
      }

      // Swap the price immediately with proration
      const updated = await stripe.subscriptions.update(org.stripeSubscriptionId, {
        items: [{ id: itemId, price: plan.stripePriceId }],
        proration_behavior: "create_prorations",
        metadata: { organizationId: org.id, planId: plan.id },
      });

      // The Stripe v22 SDK returns a LastResponse wrapper; access the raw object fields safely.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = updated as any;
      const periodEnd: number | undefined = sub.current_period_end;

      // Update DB immediately (webhook will also fire)
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          planId: plan.id,
          stripeSubscriptionStatus: updated.status,
          ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
          suspendedAt: null,
        },
      });

      return NextResponse.json({ upgraded: true, planId: plan.id });
    }
  }

  // ── Path B: no active subscription → create a Stripe Checkout session ──

  // Reuse or create the Stripe customer for this org.
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: membership.user.email ?? undefined,
      name: org.name,
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;
    await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
  }

  // Preserve the remaining app trial as the Stripe subscription trial.
  const trialEnd =
    org.trialEndsAt && org.trialEndsAt.getTime() > Date.now()
      ? Math.floor(org.trialEndsAt.getTime() / 1000)
      : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: org.id,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    payment_method_collection: "if_required",
    subscription_data: {
      ...(trialEnd ? { trial_end: trialEnd } : {}),
      metadata: { organizationId: org.id, planId: plan.id },
    },
    metadata: { organizationId: org.id, planId: plan.id },
    success_url: `${baseUrl(req)}/billing?success=1`,
    cancel_url: `${baseUrl(req)}/billing`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
