export const GBP_POSTS_PATH = "/gbp/posts";

/**
 * The posts view owns the canonical Google post composer. Keeping the route in
 * one helper prevents entry points from drifting to an older, reduced form.
 */
export function buildGbpPostComposerPath(): string {
  return `${GBP_POSTS_PATH}?compose=new`;
}

/**
 * Only the explicit, supported value opens the composer. Unknown query values
 * fail closed so they cannot change the page's behavior unexpectedly.
 */
export function isGbpPostComposerRequested(value: string | string[] | undefined): boolean {
  return value === "new";
}

/**
 * Empty accessible-location lists mean that the membership currently has no
 * location access; they must never be treated as unrestricted access.
 */
export function canAccessGbpPostLocation(
  accessibleLocationIds: readonly string[],
  locationId: string,
): boolean {
  return locationId.length > 0 && accessibleLocationIds.includes(locationId);
}
