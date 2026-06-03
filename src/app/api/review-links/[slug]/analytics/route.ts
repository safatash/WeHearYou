import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";
import { getLocationAnalytics } from "@/lib/review-link-analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { slug } = await params;
  const url = new URL(request.url);
  const rawRange = url.searchParams.get("range");
  const range = rawRange === "7" ? 7 : rawRange === "90" ? 90 : 30;

  const location = await prisma.location.findFirst({
    where: { slug, organizationId: membership.organizationId },
    select: { id: true },
  });

  if (!location) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const data = await getLocationAnalytics(location.id, range);
  return NextResponse.json({ ok: true, ...data });
}
