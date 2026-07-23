import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { planIdForPriceId } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * `current_period_end` moved between Stripe API versions (top-level on the
 * subscription in older versions, per-item in newer ones). Read defensively.
 */
function periodEnd(sub: Stripe.Subscription): Date | undefined {
  const loose = sub as unknown as { current_period_end?: number; items?: { data?: Array<{ current_period_end?: number }> } };
  const secs = loose.current_period_end ?? loose.items?.data?.[0]?.current_period_end;
  return typeof secs === "number" ? new Date(secs * 1000) : undefined;
}

async function findOrgId(customerId: string | null, metaOrgId: string | null): Promise<string | null> {
  if (metaOrgId) {
    const byMeta = await prisma.organization.findUnique({ where: { id: metaOrgId }, select: { id: true } });
    if (byMeta) return byMeta.id;
  }
  if (customerId) {
    const byCustomer = await prisma.organization.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
    if (byCustomer) return byCustomer.id;
  }
  return null;
}

async function applySubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const orgId = await findOrgId(customerId, sub.metadata?.organizationId ?? null);
  if (!orgId) return;

  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const planId = planIdForPriceId(priceId);
  const status = sub.status;
  const active = status === "active" || status === "trialing";

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripeSubscriptionStatus: status,
      ...(planId ? { planId } : {}),
      currentPeriodEnd: periodEnd(sub) ?? undefined,
      ...(active ? { suspendedAt: null } : {}),
    },
  });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await applySubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated": {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const orgId = await findOrgId(customerId, sub.metadata?.organizationId ?? null);
        if (orgId) {
          const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { trialEndsAt: true } });
          const trialExpired = org?.trialEndsAt != null && org.trialEndsAt < new Date();
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              stripeSubscriptionStatus: "canceled",
              ...(trialExpired ? { suspendedAt: new Date() } : {}),
            },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
        const orgId = await findOrgId(customerId, null);
        if (orgId) {
          await prisma.organization.update({ where: { id: orgId }, data: { stripeSubscriptionStatus: "past_due" } });
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const loose = invoice as unknown as { subscription?: string | { id: string } | null };
        const subRef = loose.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await applySubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Log and 500 so Stripe retries; never leak details to the caller.
    console.error("[stripe-webhook] handler error", event.type, err);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
