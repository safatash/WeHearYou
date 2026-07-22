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
 * Normalize the raw `data` array from `GET /me/accounts?fields=id,name,access_token`.
 * Drops anything without both an id and an access token (a page we couldn't
 * actually sync), and defaults a missing name.
 */
export function normalizeMetaPages(data: unknown): MetaPage[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : entry.id != null ? String(entry.id) : "",
      name: typeof entry.name === "string" && entry.name.trim().length > 0 ? entry.name : "Facebook Page",
      access_token: typeof entry.access_token === "string" ? entry.access_token : "",
    }))
    .filter((page) => page.id.length > 0 && page.access_token.length > 0);
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
