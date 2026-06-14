/**
 * ⚠️ TEMPORARY DEV-ONLY SPIKE — DO NOT SHIP / DO NOT COMMIT.
 *
 * Proof-of-access spike for Facebook Page recommendations via the Meta Graph
 * API (GET /{page-id}/ratings). Verifies the endpoint works on the configured
 * Graph version, which fields come back, and pagination shape — before any
 * product schema or UI is built.
 *
 * Guards:
 *   - Returns 404 in production (NODE_ENV === "production").
 *   - Token is read ONLY from META_TEST_PAGE_TOKEN (env, gitignored). It is
 *     never accepted via query string and never echoed back.
 *   - All reviewer PII and review text are redacted in the response/logs.
 *
 * Run (local, with .env populated):
 *   curl -s "http://localhost:3000/api/dev/meta-ratings-spike" | jq
 *   # optional page override (token still comes from env):
 *   curl -s "http://localhost:3000/api/dev/meta-ratings-spike?pageId=<PAGE_ID>" | jq
 */

import { NextRequest, NextResponse } from "next/server";
import {
  metaGraphGet,
  getMetaGraphApiVersion,
  MetaGraphRequestError,
  type MetaGraphConnection,
} from "@/lib/meta-graph";

const RATINGS_FIELDS = [
  "created_time",
  "has_rating",
  "has_review",
  "rating",
  "recommendation_type",
  "review_text",
  "reviewer",
  "open_graph_story",
].join(",");

type RawRating = {
  created_time?: string;
  has_rating?: boolean;
  has_review?: boolean;
  rating?: number | null;
  recommendation_type?: string | null;
  review_text?: string | null;
  reviewer?: { id?: string; name?: string } | null;
  open_graph_story?: { id?: string } | null;
  [key: string]: unknown;
};

function maskName(name: string | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return `${trimmed[0]}*** (${trimmed.length} chars)`;
}

function redactText(text: string | null | undefined): string | null {
  if (text == null) return null;
  return `[redacted ${text.length} chars]`;
}

/** Strip a Graph item down to non-PII structure for findings. */
function redactItem(item: RawRating) {
  return {
    open_graph_story_id: item.open_graph_story?.id ?? null,
    created_time: item.created_time ?? null,
    has_rating: item.has_rating ?? null,
    has_review: item.has_review ?? null,
    rating: item.rating ?? null,
    recommendation_type: item.recommendation_type ?? null,
    review_text: redactText(item.review_text),
    reviewer: item.reviewer
      ? { id_present: Boolean(item.reviewer.id), name: maskName(item.reviewer.name) }
      : null,
  };
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const token = process.env.META_TEST_PAGE_TOKEN?.trim();
  const pageId =
    request.nextUrl.searchParams.get("pageId")?.trim() ||
    process.env.META_TEST_PAGE_ID?.trim();

  const missing: string[] = [];
  if (!token) missing.push("META_TEST_PAGE_TOKEN");
  if (!pageId) missing.push("META_TEST_PAGE_ID (or ?pageId=)");
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Missing required env: ${missing.join(", ")}. Add them to your gitignored .env for local verification only.`,
        graphApiVersion: getMetaGraphApiVersion(),
      },
      { status: 400 },
    );
  }

  const limit = request.nextUrl.searchParams.get("limit")?.trim() || "25";

  try {
    const result = await metaGraphGet<MetaGraphConnection<RawRating>>(
      `${pageId}/ratings`,
      { fields: RATINGS_FIELDS, limit },
      token!,
    );

    const data = Array.isArray(result.data) ? result.data : [];
    const fieldKeysSeen = Array.from(
      new Set(data.flatMap((item) => Object.keys(item))),
    ).sort();

    return NextResponse.json({
      ok: true,
      graphApiVersion: getMetaGraphApiVersion(),
      requestedFields: RATINGS_FIELDS.split(","),
      count: data.length,
      fieldKeysSeen, // which fields the API actually returned
      sample: data.slice(0, 3).map(redactItem), // redacted, PII-free
      paging: {
        hasNext: Boolean(result.paging?.next),
        hasPrevious: Boolean(result.paging?.previous),
        cursorsPresent: Boolean(result.paging?.cursors),
      },
    });
  } catch (error) {
    if (error instanceof MetaGraphRequestError) {
      // Surface the Graph error WITHOUT the token; safe to read in findings.
      return NextResponse.json(
        {
          ok: false,
          httpStatus: error.status,
          graphError: error.graphError ?? { message: error.message },
          graphApiVersion: getMetaGraphApiVersion(),
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
