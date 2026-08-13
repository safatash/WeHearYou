export const GBP_POSTS_PATH = "/gbp/posts";
export const GBP_NEW_POST_PATH = "/gbp/post/new";
export const GBP_LEGACY_NEW_POST_PATH = "/gbp/posts/new";

/**
 * The canonical new-post URL deliberately identifies the full drawer route.
 * Keeping it in one helper prevents dashboard and posts-list entry points from
 * drifting back to the retired standalone form.
 */
export function buildGbpPostComposerPath(): string {
  return GBP_NEW_POST_PATH;
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
