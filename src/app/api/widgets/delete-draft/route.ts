import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/authz";

export const dynamic = "force-dynamic";

/**
 * POST /api/widgets/delete-draft
 *
 * Called via navigator.sendBeacon() when a user navigates away from a new
 * widget editor without saving. Deletes the unsaved draft widget so it does
 * not appear as an orphan in the widget list.
 *
 * Only deletes if:
 * - The widget belongs to the authenticated user's organization
 * - The widget name is still "Untitled widget" (never renamed = never saved)
 */
export async function POST(request: NextRequest) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let widgetId: string | null = null;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      widgetId = String(formData.get("widgetId") ?? "").trim() || null;
    } else {
      // sendBeacon sends as text/plain or application/x-www-form-urlencoded
      const text = await request.text();
      const params = new URLSearchParams(text);
      widgetId = params.get("widgetId")?.trim() || null;
    }

    if (!widgetId) {
      return NextResponse.json({ error: "widgetId required" }, { status: 400 });
    }

    const widget = await prisma.reviewWidget.findUnique({
      where: { id: widgetId },
      select: { id: true, organizationId: true, name: true },
    });

    if (!widget) {
      return NextResponse.json({ deleted: false, reason: "not_found" });
    }

    if (widget.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only delete if the widget was never renamed (still the default draft name)
    if (widget.name !== "Untitled widget") {
      return NextResponse.json({ deleted: false, reason: "already_named" });
    }

    await prisma.reviewWidget.delete({ where: { id: widgetId } });
    return NextResponse.json({ deleted: true });
  } catch {
    // Silently succeed — this is a best-effort cleanup
    return NextResponse.json({ deleted: false });
  }
}
