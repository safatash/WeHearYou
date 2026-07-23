import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/authz";
import { canManageBilling } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";
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
