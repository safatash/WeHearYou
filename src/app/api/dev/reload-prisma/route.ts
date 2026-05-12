import { NextResponse } from "next/server";

export async function POST() {
  const globalAny = global as typeof globalThis & { prisma?: { $disconnect?: () => Promise<void> } };

  if (globalAny.prisma?.$disconnect) {
    await globalAny.prisma.$disconnect();
  }

  delete globalAny.prisma;

  return NextResponse.json({ ok: true, message: "Cleared cached Prisma client. Refresh the page to re-instantiate it." });
}
