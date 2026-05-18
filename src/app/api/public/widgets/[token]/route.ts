import { NextRequest, NextResponse } from "next/server";
import { getPublicReviewWidgetPayload } from "@/lib/review-widgets";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const pageParam = request.nextUrl.searchParams.get("page");
  const page = pageParam ? Number(pageParam) : 1;

  const payload = await getPublicReviewWidgetPayload(token, page);

  if (!payload) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404, headers: CORS_HEADERS });
  }

  return NextResponse.json(payload, {
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
