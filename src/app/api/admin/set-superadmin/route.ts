import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "why-bootstrap-2026";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const user = await prisma.user.update({
    where: { email },
    data: { isSuperAdmin: true },
    select: { id: true, email: true, isSuperAdmin: true },
  });

  return NextResponse.json({ ok: true, user });
}
