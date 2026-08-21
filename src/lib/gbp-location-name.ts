/**
 * Google Business Profile locations are stored as "locations/{locationId}", but
 * the v4 API addresses them as "accounts/{accountId}/locations/{locationId}".
 * Calling a v4 endpoint with the bare stored name returns a 404 from Google.
 *
 * The account id is deliberately not persisted — a connection can span several
 * accounts, so it is resolved from Google at call time.
 */

export type GbpLocationCandidate = {
  name: string;
  accountResourceName?: string;
};

/**
 * Qualify a stored location name with its account prefix.
 *
 * Already-qualified names pass through unchanged, so this is safe to apply more
 * than once. When no matching account is found the stored name is returned as
 * it is: the caller then fails loudly against Google rather than silently
 * addressing some other account's location.
 */
export function qualifyGbpLocationName(
  storedName: string,
  googleLocations: readonly GbpLocationCandidate[],
): string {
  if (!storedName) return storedName;
  if (storedName.startsWith("accounts/")) return storedName;

  const match = googleLocations.find((location) => location.name === storedName);
  if (!match?.accountResourceName) return storedName;

  return `${match.accountResourceName}/${storedName}`;
}

/**
 * Resolve the full v4 resource name for a stored location, fetching the
 * caller's Google accounts to find the owning account.
 */
export async function resolveGbpLocationName(
  accessToken: string,
  storedName: string,
): Promise<string> {
  if (!storedName || storedName.startsWith("accounts/")) return storedName;

  const { fetchGoogleBusinessLocations } = await import("@/lib/google-oauth");
  const googleLocations = await fetchGoogleBusinessLocations(accessToken);

  return qualifyGbpLocationName(storedName, googleLocations);
}
