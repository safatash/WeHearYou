import { NextRequest, NextResponse } from "next/server";
import { buildMetaOAuthUrl } from "@/lib/meta-oauth";
import { randomUUID } from "node:crypto";

export async function GET(_request: NextRequest) {
  const state = randomUUID();
  const url = buildMetaOAuthUrl(state);
  const response = NextResponse.redirect(url);
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
