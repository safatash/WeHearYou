import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMetaOAuthUrl } from "@/lib/meta-oauth";
import { randomUUID } from "node:crypto";

export async function GET(_request: NextRequest) {
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  const url = buildMetaOAuthUrl(state);
  return NextResponse.redirect(url);
}
