import crypto from "node:crypto";
import { metaGraphGet, getMetaGraphApiVersion, type MetaGraphConnection } from "@/lib/meta-graph";
import {
  normalizeMetaPageDiscovery,
  normalizeMetaPages,
  type MetaPage,
  type MetaPageDiscovery,
} from "@/lib/meta-pages";

export type { MetaPage } from "@/lib/meta-pages";

export type MetaOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getMetaOAuthConfig(): MetaOAuthConfig {
  return {
    clientId: process.env.META_APP_ID?.trim() ?? "",
    clientSecret: process.env.META_APP_SECRET?.trim() ?? "",
    redirectUri: process.env.META_OAUTH_REDIRECT_URI?.trim() ?? "",
  };
}

export function getMissingMetaOAuthConfig(config: MetaOAuthConfig = getMetaOAuthConfig()): string[] {
  const missing: string[] = [];
  if (!config.clientId.trim()) missing.push("META_APP_ID");
  if (!config.clientSecret.trim()) missing.push("META_APP_SECRET");
  if (!config.redirectUri.trim()) missing.push("META_OAUTH_REDIRECT_URI");
  return missing;
}

export function isMetaOAuthConfigured(config: MetaOAuthConfig = getMetaOAuthConfig()): boolean {
  return getMissingMetaOAuthConfig(config).length === 0;
}

export function buildMetaOAuthUrl(state: string): string {
  const config = getMetaOAuthConfig();
  const missing = getMissingMetaOAuthConfig(config);
  if (missing.length > 0) {
    throw new Error(`Meta OAuth is not configured: missing ${missing.join(", ")}`);
  }
  // Meta requires pages_manage_metadata alongside Page-read scopes when issuing
  // the Page access token returned by /me/accounts. We use that token only for
  // read-only Page recommendation sync; this integration does not write Page metadata.
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
    "pages_manage_metadata",
  ];
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

  const missing = getMissingMetaOAuthConfig(config);
  if (missing.length > 0) {
    throw new Error(`Meta OAuth is not configured: missing ${missing.join(", ")}`);
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

/**
 * Exchange a short-lived user token for a long-lived one. Page tokens derived
 * from a long-lived user token do not expire, so this keeps synced connections
 * healthy. On any failure we fall back to the original token (still valid for
 * ~1 hour — long enough to complete page selection).
 */
export async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const config = getMetaOAuthConfig();
  if (!config.clientId || !config.clientSecret) return shortLivedToken;

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    fb_exchange_token: shortLivedToken,
  });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v${getMetaGraphApiVersion().slice(1)}/oauth/access_token?${params.toString()}`,
      { method: "GET", cache: "no-store" },
    );
    const json: unknown = await res.json().catch(() => null);
    if (res.ok && json && typeof json === "object" && "access_token" in json) {
      const token = (json as { access_token?: unknown }).access_token;
      if (typeof token === "string" && token.length > 0) return token;
    }
  } catch {
    // fall through to the short-lived token
  }

  return shortLivedToken;
}

/**
 * List the Facebook Pages a user manages, each with its own page access token.
 * The ratings/reviews edges live on the Page node and require the page token —
 * the user token cannot read them.
 */
export type MetaUserPageDiscovery = MetaPageDiscovery;

export async function fetchMetaUserPageDiscovery(
  userAccessToken: string,
): Promise<MetaUserPageDiscovery> {
  const pages: MetaPage[] = [];
  let returnedCount = 0;
  let missingPageTokenCount = 0;
  let afterCursor: string | undefined;

  do {
    const result = await metaGraphGet<MetaGraphConnection<Record<string, unknown>>>(
      "me/accounts",
      { fields: "id,name,access_token", limit: "100", after: afterCursor ?? "" },
      userAccessToken,
    );
    const discovery = normalizeMetaPageDiscovery(result.data);
    pages.push(...discovery.pages);
    returnedCount += discovery.returnedCount;
    missingPageTokenCount += discovery.missingPageTokenCount;
    afterCursor = result.paging?.next ? result.paging?.cursors?.after : undefined;
  } while (afterCursor);

  return { pages, returnedCount, missingPageTokenCount };
}

export async function fetchMetaUserPages(userAccessToken: string): Promise<MetaPage[]> {
  return (await fetchMetaUserPageDiscovery(userAccessToken)).pages;
}

/**
 * Verifies a single user-supplied Page ID after OAuth when Meta's `/me/accounts`
 * relation is empty for a business-managed Page. The user token must be able to
 * obtain the Page access token; otherwise this throws and nothing is persisted.
 * The Page token remains server-side and is encrypted only by the connection
 * storage helper after the caller has checked tenant authorization.
 */
export async function fetchMetaPageById(
  userAccessToken: string,
  pageId: string,
): Promise<MetaPage> {
  const result = await metaGraphGet<Record<string, unknown>>(
    pageId,
    { fields: "id,name,access_token" },
    userAccessToken,
  );

  const discovery = normalizeMetaPageDiscovery([result]);
  const page = discovery.pages[0];
  if (!page) {
    throw new Error("Meta could not issue a Page access token for that Page ID.");
  }

  return page;
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
