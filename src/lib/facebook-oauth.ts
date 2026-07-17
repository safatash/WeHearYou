/**
 * Facebook OAuth helpers for the Pages integration.
 *
 * Mirrors the structure of google-oauth.ts: config getters, state helpers,
 * token exchange, user/page fetching, and Prisma upsert helpers.
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/token-encryption";
import { metaGraphGet, MetaGraphConnection } from "@/lib/meta-graph";

// ─── Config ──────────────────────────────────────────────────────────────────

export function getFacebookOAuthConfig() {
  return {
    appId: process.env.FACEBOOK_APP_ID ?? "",
    appSecret: process.env.FACEBOOK_APP_SECRET ?? "",
    redirectUri: process.env.FACEBOOK_OAUTH_REDIRECT_URI ?? "https://wehearyou.app/api/integrations/facebook/callback",
  };
}

// ─── OAuth state (HMAC-signed, same pattern as Google) ───────────────────────

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getOAuthStateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OAUTH_STATE_SECRET environment variable is required in production");
    }
    return "dev-oauth-state-secret-not-for-production";
  }
  return secret;
}

export type FacebookOAuthStatePayload = {
  organizationId: string;
  returnTo?: string;
  nonce: string;
  expiresAt: number;
};

export function createFacebookOAuthState(payload: { organizationId: string; returnTo?: string }): string {
  const secret = getOAuthStateSecret();
  const fullPayload: FacebookOAuthStatePayload = {
    ...payload,
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyFacebookOAuthState(state: string): FacebookOAuthStatePayload | null {
  try {
    const secret = getOAuthStateSecret();
    const dot = state.lastIndexOf(".");
    if (dot === -1) return null;

    const encoded = state.slice(0, dot);
    const sig = state.slice(dot + 1);

    const expectedSig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as FacebookOAuthStatePayload;

    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

// ─── OAuth URL builder ───────────────────────────────────────────────────────

const FACEBOOK_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_read_user_content"];

export function buildFacebookOAuthUrl({ organizationId, returnTo }: { organizationId: string; returnTo?: string }): string {
  const { appId, redirectUri } = getFacebookOAuthConfig();
  const state = createFacebookOAuthState({ organizationId, returnTo });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: FACEBOOK_SCOPES.join(","),
    response_type: "code",
    state,
  });

  return `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;
}

// ─── Token exchange ──────────────────────────────────────────────────────────

export async function exchangeFacebookCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
}> {
  const { appId, appSecret, redirectUri } = getFacebookOAuthConfig();

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Facebook token exchange failed: ${text}`);
  }

  return (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };
}

/**
 * Exchange a short-lived token for a long-lived user access token.
 * Long-lived tokens are valid for ~60 days.
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
}> {
  const { appId, appSecret } = getFacebookOAuthConfig();

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Facebook long-lived token exchange failed: ${text}`);
  }

  return (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };
}

// ─── API helpers ─────────────────────────────────────────────────────────────

export type FacebookUserInfo = {
  id: string;
  name?: string;
  email?: string;
};

export async function fetchFacebookUserInfo(accessToken: string): Promise<FacebookUserInfo> {
  return metaGraphGet<FacebookUserInfo>("me", { fields: "id,name,email" }, accessToken);
}

export type FacebookPageInfo = {
  id: string;
  name: string;
  access_token: string;
  category?: string;
};

export async function fetchFacebookPages(userAccessToken: string): Promise<FacebookPageInfo[]> {
  const result = await metaGraphGet<MetaGraphConnection<FacebookPageInfo>>(
    "me/accounts",
    { fields: "id,name,access_token,category" },
    userAccessToken,
  );
  return result.data ?? [];
}

// ─── Facebook Rating types ────────────────────────────────────────────────────

export type FacebookRating = {
  created_time?: string;
  has_rating?: boolean;
  has_review?: boolean;
  rating?: number; // 1-5
  recommendation_type?: "positive" | "negative";
  review_text?: string;
  reviewer?: {
    id?: string;
    name?: string;
  };
  open_graph_story?: {
    id?: string;
  };
};

export async function fetchFacebookPageRatings(pageId: string, pageAccessToken: string): Promise<FacebookRating[]> {
  const allRatings: FacebookRating[] = [];
  let afterCursor: string | undefined;
  let pageCount = 0;
  const maxPages = 200;

  do {
    const params: Record<string, string> = {
      fields: "created_time,has_rating,has_review,rating,recommendation_type,review_text,reviewer",
      limit: "100",
    };
    if (afterCursor) {
      params.after = afterCursor;
    }

    const result = await metaGraphGet<MetaGraphConnection<FacebookRating>>(
      `${pageId}/ratings`,
      params,
      pageAccessToken,
    );

    if (result.data?.length) {
      allRatings.push(...result.data);
    }

    afterCursor = result.paging?.cursors?.after;
    const hasNext = Boolean(result.paging?.next);
    pageCount += 1;

    if (!hasNext) break;
  } while (afterCursor && pageCount < maxPages);

  return allRatings;
}

// ─── Prisma helpers ───────────────────────────────────────────────────────────

export async function upsertFacebookConnection({
  organizationId,
  userId,
  userName,
  userEmail,
  accessToken,
  expiresIn,
}: {
  organizationId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  accessToken: string;
  expiresIn?: number;
}) {
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  const existing = await prisma.facebookPageConnection.findFirst({
    where: { organizationId },
  });

  const encryptedToken = encryptToken(accessToken) ?? accessToken;

  if (existing) {
    return prisma.facebookPageConnection.update({
      where: { id: existing.id },
      data: {
        userId,
        userName,
        userEmail,
        accessToken: encryptedToken,
        expiresAt,
      },
    });
  }

  return prisma.facebookPageConnection.create({
    data: {
      organizationId,
      userId,
      userName,
      userEmail,
      accessToken: encryptedToken,
      expiresAt,
    },
  });
}

export async function getFacebookConnections(organizationId: string) {
  const connections = await prisma.facebookPageConnection.findMany({
    where: { organizationId },
    include: {
      pages: {
        include: {
          location: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      organization: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    connections.map(async (connection) => {
      // Fetch available Facebook pages for the connection
      let facebookPages: FacebookPageInfo[] = [];
      let fetchError: string | null = null;

      try {
        const accessToken = decryptToken(connection.accessToken);
        if (accessToken) {
          facebookPages = await fetchFacebookPages(accessToken);
        }
      } catch (error) {
        fetchError = error instanceof Error ? error.message : "Failed to load Facebook pages";
      }

      const linkedLocationIds = connection.pages.map((p) => p.locationId).filter(Boolean) as string[];
      const reviewCount = linkedLocationIds.length
        ? await prisma.review.count({
            where: {
              locationId: { in: linkedLocationIds },
              source: "FACEBOOK",
            },
          })
        : 0;

      return {
        ...connection,
        facebookPages,
        fetchError,
        reviewCount,
      };
    }),
  );
}

export function getDecryptedFacebookToken(connection: { accessToken: string }): string | null {
  return decryptToken(connection.accessToken);
}
