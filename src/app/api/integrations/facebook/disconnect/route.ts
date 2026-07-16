import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function redirectToIntegrations(pathAndQuery: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(new URL(pathAndQuery, appUrl));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connectionId");

  if (!connectionId) {
    return redirectToIntegrations("/integrations?facebook=missing_params");
  }

  try {
    // Verify the connection belongs to the current user's organization.
    const connection = await prisma.facebookPageConnection.findUnique({
      where: { id: connectionId },
      select: { organizationId: true },
    });

    if (!connection) {
      return redirectToIntegrations("/integrations?facebook=not_found");
    }

    await requireOrganizationAccess(connection.organizationId);

    // Delete the connection (cascades to FacebookPage rows via DB constraint).
    await prisma.facebookPageConnection.delete({
      where: { id: connectionId },
    });

    revalidatePath("/integrations");
    revalidatePath("/");

    return redirectToIntegrations("/integrations?facebook=disconnected");
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[facebook/disconnect] Error:", message);
    return redirectToIntegrations("/integrations?facebook=error&reason=Disconnect+failed");
  }
}
