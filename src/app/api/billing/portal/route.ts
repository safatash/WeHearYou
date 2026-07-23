import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/authz";
import { canManageBilling } from "@/lib/team";
import { stripe, stripeConfigured } from "@/lib/stripe";
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

  const customerId = membership.organization.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: "No subscription to manage yet." }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl(req)}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
