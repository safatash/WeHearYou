import crypto from "node:crypto";
import { metaGraphGet, getMetaGraphApiVersion, type MetaGraphConnection } from "@/lib/meta-graph";

export function getMetaOAuthConfig() {
  return {
    clientId: process.env.META_APP_ID ?? "",
    clientSecret: process.env.META_APP_SECRET ?? "",
    redirectUri: process.env.META_OAUTH_REDIRECT_URI ?? "",
  };
}

export function buildMetaOAuthUrl(state: string): string {
  const config = getMetaOAuthConfig();
  const scopes = ["pages_show_list", "pages_read_engagement", "pages_read_user_content"];
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: scopes.join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/v${getMetaGraphApiVersion().slice(1)}/dialog/oauth?${params.toString()}`;
}

export type MetaTokenExchangeResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeMetaCodeForToken(
  code: string,
  state: string,
): Promise<MetaTokenExchangeResponse> {
  const config = getMetaOAuthConfig();

  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("Meta OAuth not configured: missing META_APP_ID, META_APP_SECRET, or META_OAUTH_REDIRECT_URI");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const res = await fetch(`https://graph.facebook.com/v${getMetaGraphApiVersion().slice(1)}/oauth/access_token`, {
    method: "POST",
    body: params,
    cache: "no-store",
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const error = json && typeof json === "object" && "error" in json
      ? JSON.stringify(json)
      : `HTTP ${res.status}`;
    throw new Error(`Meta token exchange failed: ${error}`);
  }

  if (!json || typeof json !== "object" || !("access_token" in json)) {
    throw new Error("Meta token exchange failed: missing access_token in response");
  }

  return json as MetaTokenExchangeResponse;
}

export type MetaPageInfo = {
  id: string;
  name: string;
};

export async function fetchMetaPageInfo(
  accessToken: string,
): Promise<MetaPageInfo> {
  const result = await metaGraphGet<{ id: string; name: string }>(
    "me",
    { fields: "id,name" },
    accessToken,
  );

  if (!result.id) {
    throw new Error("Failed to fetch Meta page info: missing page ID");
  }

  return {
    id: result.id,
    name: result.name ?? "Facebook Page",
  };
}

export type RawRating = {
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

export async function fetchMetaPageRatings(
  accessToken: string,
  pageId: string,
  limit: string = "100",
  afterCursor?: string,
): Promise<MetaGraphConnection<RawRating>> {
  const result = await metaGraphGet<MetaGraphConnection<RawRating>>(
    `${pageId}/ratings`,
    {
      fields: "created_time,has_rating,has_review,rating,recommendation_type,review_text,reviewer,open_graph_story",
      limit,
      after: afterCursor || "",
    },
    accessToken,
  );

  return result;
}

export function normalizeMetaRating(rating: number | null | undefined): number {
  if (rating == null || typeof rating !== "number") return 0;
  return Math.max(0, Math.min(5, Math.round(rating)));
}
