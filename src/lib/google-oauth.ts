import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_BUSINESS_ACCOUNTS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const GOOGLE_BUSINESS_LOCATIONS_URL = "https://mybusinessbusinessinformation.googleapis.com/v1";
const GOOGLE_BUSINESS_REVIEWS_URL = "https://mybusiness.googleapis.com/v4";
const GOOGLE_PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/business.manage",
];

export type GoogleBusinessAccount = {
  name: string;
  accountName?: string;
  type?: string;
};

export type GoogleBusinessLocation = {
  name: string;
  title?: string;
  storeCode?: string;
  languageCode?: string;
  accountName?: string;
  accountResourceName?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
  metadata?: {
    placeId?: string;
    mapsUri?: string;
    newReviewUri?: string;
  };
  regularHours?: {
    periods?: Array<{
      openDay?: string;
      openTime?: string;
      closeDay?: string;
      closeTime?: string;
    }>;
    weekdayDescriptions?: string[];
  };
};

export type GooglePlacesSearchResult = {
  id: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
};

export type GoogleReview = {
  reviewId: string;
  reviewer?: {
    displayName?: string;
    profilePhotoUrl?: string;
  };
  starRating?: string;
  comment?: string;
  reviewReply?: {
    comment?: string;
    updateTime?: string;
  };
  reviewUrl?: string;
  createTime?: string;
  updateTime?: string;
};

export function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  };
}

export function getGooglePlacesConfig() {
  return {
    apiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
  };
}

export function buildGoogleOAuthUrl({ organizationId, connectionId }: { organizationId: string; connectionId?: string }) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const state = createOAuthState({ organizationId, connectionId });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES.join(" "),
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function createOAuthState(payload: { organizationId: string; connectionId?: string }) {
  return Buffer.from(JSON.stringify({ ...payload, nonce: crypto.randomUUID() })).toString("base64url");
}

export function parseOAuthState(state: string) {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      organizationId: string;
      connectionId?: string;
      nonce: string;
    };
  } catch {
    return null;
  }
}

export async function exchangeGoogleCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    id_token?: string;
  };
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google userinfo fetch failed: ${text}`);
  }

  return (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token refresh failed: ${text}`);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    refresh_token?: string;
  };
}

export async function getValidGoogleAccessToken(connection: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope?: string | null;
  tokenType?: string | null;
}) {
  const expiresSoon = connection.expiresAt ? connection.expiresAt.getTime() <= Date.now() + 60_000 : false;

  if (connection.accessToken && !expiresSoon) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    if (connection.accessToken) {
      return connection.accessToken;
    }

    throw new Error("Google access token is missing and no refresh token is available");
  }

  const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
  const expiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null;

  await prisma.googleAccountConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? connection.refreshToken,
      scope: refreshed.scope ?? connection.scope ?? null,
      tokenType: refreshed.token_type ?? connection.tokenType ?? null,
      expiresAt,
    },
  });

  return refreshed.access_token;
}

async function googleFetch<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google API request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export async function fetchGoogleBusinessAccounts(accessToken: string) {
  const response = await googleFetch<{ accounts?: GoogleBusinessAccount[] }>(GOOGLE_BUSINESS_ACCOUNTS_URL, accessToken);
  return response.accounts ?? [];
}

export async function fetchGoogleBusinessLocations(accessToken: string) {
  const accounts = await fetchGoogleBusinessAccounts(accessToken);
  const locationSets = await Promise.all(
    accounts.map(async (account) => {
      const allLocations: GoogleBusinessLocation[] = [];
      let pageToken: string | undefined;
      let pageCount = 0;
      const maxPages = 50;

      do {
        const url = new URL(`${GOOGLE_BUSINESS_LOCATIONS_URL}/${account.name}/locations`);
        url.searchParams.set("readMask", "name,title,storeCode,languageCode,storefrontAddress,metadata,regularHours");
        url.searchParams.set("pageSize", "100");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const response = await googleFetch<{ locations?: GoogleBusinessLocation[]; nextPageToken?: string }>(
          url.toString(),
          accessToken,
        );

        if (response.locations?.length) {
          allLocations.push(...response.locations);
        }

        pageToken = response.nextPageToken;
        pageCount += 1;
      } while (pageToken && pageCount < maxPages);

      return allLocations.map((location) => ({
        ...location,
        accountName: account.accountName,
        accountResourceName: account.name,
      }));
    }),
  );

  return locationSets.flat();
}

export async function fetchGoogleLocationReviews({ accessToken, googleLocationName }: { accessToken: string; googleLocationName: string }) {
  const allReviews: GoogleReview[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 200;

  do {
    const url = new URL(`${GOOGLE_BUSINESS_REVIEWS_URL}/${googleLocationName}/reviews`);
    url.searchParams.set("pageSize", "50");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await googleFetch<{ reviews?: GoogleReview[]; nextPageToken?: string }>(url.toString(), accessToken);

    if (response.reviews?.length) {
      allReviews.push(...response.reviews);
    }

    pageToken = response.nextPageToken;
    pageCount += 1;
  } while (pageToken && pageCount < maxPages);

  return allReviews;
}

export async function searchGooglePlaces(query: string) {
  const { apiKey } = getGooglePlacesConfig();

  if (!apiKey) {
    throw new Error("Google Places API is not configured. Add GOOGLE_PLACES_API_KEY.");
  }

  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.location",
        "places.addressComponents",
        "places.googleMapsUri",
        "places.nationalPhoneNumber",
        "places.websiteUri",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 5,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Places search failed: ${text}`);
  }

  const json = (await response.json()) as { places?: GooglePlacesSearchResult[] };
  return json.places ?? [];
}

export function normalizeGoogleStarRating(starRating?: string) {
  switch (starRating) {
    case "ONE":
      return 1;
    case "TWO":
      return 2;
    case "THREE":
      return 3;
    case "FOUR":
      return 4;
    case "FIVE":
      return 5;
    default:
      return 5;
  }
}

export async function upsertGoogleConnection({
  organizationId,
  providerAccountId,
  email,
  accessToken,
  refreshToken,
  tokenType,
  scope,
  expiresIn,
}: {
  organizationId: string;
  providerAccountId?: string;
  email?: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresIn?: number;
}) {
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  const existing = providerAccountId
    ? await prisma.googleAccountConnection.findFirst({
        where: {
          organizationId,
          providerAccountId,
        },
      })
    : null;

  if (existing) {
    return prisma.googleAccountConnection.update({
      where: { id: existing.id },
      data: {
        email,
        accessToken,
        refreshToken: refreshToken ?? existing.refreshToken,
        tokenType,
        scope,
        expiresAt,
      },
    });
  }

  return prisma.googleAccountConnection.create({
    data: {
      organizationId,
      providerAccountId,
      email,
      accessToken,
      refreshToken,
      tokenType,
      scope,
      expiresAt,
    },
  });
}

export async function getGoogleConnections(organizationId: string) {
  const connections = await prisma.googleAccountConnection.findMany({
    where: {
      organizationId,
    },
    include: {
      locations: {
        orderBy: [{ createdAt: "asc" }],
      },
      organization: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const enriched = await Promise.all(
    connections.map(async (connection) => {
      let googleLocations: Array<GoogleBusinessLocation & { accountName?: string; accountResourceName?: string }> = [];
      let fetchError: string | null = null;
      let tokenStatus: "healthy" | "expiring" | "missing_refresh" | "refresh_failed" = "healthy";

      if (!connection.refreshToken && !connection.accessToken) {
        tokenStatus = "missing_refresh";
      } else if (connection.expiresAt && connection.expiresAt.getTime() <= Date.now() + 60_000) {
        tokenStatus = connection.refreshToken ? "expiring" : "missing_refresh";
      }

      try {
        const accessToken = await getValidGoogleAccessToken({
          id: connection.id,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt: connection.expiresAt,
          scope: connection.scope,
          tokenType: connection.tokenType,
        });
        googleLocations = await fetchGoogleBusinessLocations(accessToken);
      } catch (error) {
        fetchError = error instanceof Error ? error.message : "Failed to load Google locations";
        tokenStatus = fetchError.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") || fetchError.includes("insufficient authentication scopes")
          ? "refresh_failed"
          : fetchError.includes("refresh") || fetchError.includes("token")
            ? "refresh_failed"
            : tokenStatus;
      }

      const syncedLocationIds = connection.locations.map((location) => location.id);
      const reviewCount = syncedLocationIds.length
        ? await prisma.review.count({
            where: {
              locationId: {
                in: syncedLocationIds,
              },
              source: "GOOGLE",
            },
          })
        : 0;

      return {
        ...connection,
        googleLocations,
        fetchError,
        reviewCount,
        tokenStatus,
      };
    }),
  );

  return enriched;
}
