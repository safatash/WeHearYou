/**
 * Minimal, production-safe Meta Graph API client.
 *
 * Pure transport: callers pass the access token explicitly (it is never read
 * from a global here), and the token is sent via the Authorization header so it
 * does not appear in request URLs or access logs. The API version is read from
 * META_GRAPH_API_VERSION (validated; falls back to a known-good default).
 *
 * This file contains no secrets and no endpoint-specific logic, so it is safe
 * to ship ahead of any Facebook Reviews product UI.
 */

const DEFAULT_GRAPH_API_VERSION = "v23.0";

export function getMetaGraphApiVersion(): string {
  const raw = process.env.META_GRAPH_API_VERSION?.trim();
  return raw && /^v\d+\.\d+$/.test(raw) ? raw : DEFAULT_GRAPH_API_VERSION;
}

export type MetaGraphError = {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

export class MetaGraphRequestError extends Error {
  readonly status: number;
  readonly graphError?: MetaGraphError;

  constructor(status: number, message: string, graphError?: MetaGraphError) {
    super(message);
    this.name = "MetaGraphRequestError";
    this.status = status;
    this.graphError = graphError;
  }
}

export type MetaGraphPaging = {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
};

export type MetaGraphConnection<T> = {
  data: T[];
  paging?: MetaGraphPaging;
};

/**
 * Perform a GET against the Graph API. `path` is the edge after the version
 * segment (e.g. "{page-id}/ratings"). Query params are appended; the token is
 * sent as a Bearer header. Throws MetaGraphRequestError on a non-2xx response.
 */
export async function metaGraphGet<T = unknown>(
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<T> {
  const version = getMetaGraphApiVersion();
  const url = new URL(`https://graph.facebook.com/${version}/${path.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const graphError =
      json && typeof json === "object" && "error" in json
        ? ((json as { error: MetaGraphError }).error)
        : undefined;
    throw new MetaGraphRequestError(
      res.status,
      graphError?.message ?? `Meta Graph request failed (HTTP ${res.status})`,
      graphError,
    );
  }

  return json as T;
}
