/**
 * Pure helpers for turning a Facebook user's `/me/accounts` response into the
 * list of pages we can connect, and for deciding whether the connect flow can
 * auto-select a page or must show a picker.
 *
 * Kept free of network / Prisma / Next imports so it is unit-testable in
 * isolation (see meta-pages.test.ts).
 */

export type MetaPage = {
  id: string;
  name: string;
  /** Page access token — this is what review syncs must use, not the user token. */
  access_token: string;
};

/**
 * Normalizes the optional direct Page-ID fallback used only after Meta returns
 * an empty `/me/accounts` list. Facebook Page IDs are numeric; rejecting every
 * other input keeps the Graph path deterministic and avoids treating arbitrary
 * URLs or node paths as page identifiers.
 */
export function normalizeMetaPageId(value: unknown): string | null {
  const pageId = typeof value === "string" ? value.trim() : "";
  return /^\d{5,25}$/.test(pageId) ? pageId : null;
}

/** A token-safe summary of a `/me/accounts` response. */
export type MetaPageDiscovery = {
  pages: MetaPage[];
  returnedCount: number;
  missingPageTokenCount: number;
};

/**
 * Normalize the raw `data` array from `GET /me/accounts?fields=id,name,access_token`.
 * It preserves token-safe counts so the caller can distinguish an actual empty
 * Page list from Pages Meta returned without usable Page access tokens.
 */
export function normalizeMetaPageDiscovery(data: unknown): MetaPageDiscovery {
  if (!Array.isArray(data)) {
    return { pages: [], returnedCount: 0, missingPageTokenCount: 0 };
  }

  const candidates = data
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : entry.id != null ? String(entry.id) : "",
      name: typeof entry.name === "string" && entry.name.trim().length > 0 ? entry.name : "Facebook Page",
      access_token: typeof entry.access_token === "string" ? entry.access_token : "",
    }));

  return {
    pages: candidates.filter((page) => page.id.length > 0 && page.access_token.length > 0),
    returnedCount: candidates.length,
    missingPageTokenCount: candidates.filter(
      (page) => page.id.length > 0 && page.access_token.length === 0,
    ).length,
  };
}

/** Backward-compatible Page list used by callers that do not need diagnostics. */
export function normalizeMetaPages(data: unknown): MetaPage[] {
  return normalizeMetaPageDiscovery(data).pages;
}

export type MetaPageSelection =
  | { kind: "none" }
  | { kind: "single"; page: MetaPage }
  | { kind: "multiple"; pages: MetaPage[] };

/**
 * Decide how the connect flow should proceed given the pages a user manages:
 * - none    → the account has no manageable pages (surface an error)
 * - single  → auto-connect it, no picker needed
 * - multiple→ show the picker so the user chooses one
 */
export function categorizeMetaPageSelection(pages: MetaPage[]): MetaPageSelection {
  if (pages.length === 0) return { kind: "none" };
  if (pages.length === 1) return { kind: "single", page: pages[0] };
  return { kind: "multiple", pages };
}
