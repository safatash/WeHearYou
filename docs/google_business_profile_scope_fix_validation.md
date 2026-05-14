# Google Business Profile Scope Fix Validation

**Author:** Manus AI  
**Date:** May 13, 2026

## Summary

The Google integration state shown for `novaadvertisingmaps@gmail.com` was not another organization-isolation leak. The record belongs to **NOVA MedMarket**, but its stored OAuth scope does not include `https://www.googleapis.com/auth/business.manage`. Because Google Business Profile location discovery requires that scope, the app correctly received Google’s `ACCESS_TOKEN_SCOPE_INSUFFICIENT` / `PERMISSION_DENIED` response when trying to list Business Profile accounts.

The application-level problem was that the UI warning told the user to use **Reconnect / refresh**, but the connection controls were hidden when the Google account had zero mapped WeHearYou locations. In addition, the previous refresh action only refreshed the existing token, which cannot add a missing OAuth permission scope. The patch makes the control visible for zero-location connections and changes **Reconnect / refresh** to send the user through Google OAuth consent again, scoped to the current organization.

## Changes Applied

| Area | File | Change |
|---|---|---|
| Integrations UI | `src/app/integrations/page.tsx` | The reconnect, sync, retry, and disconnect controls now render for every Google connection, including connections with zero mapped locations. |
| Insufficient-scope guidance | `src/app/integrations/page.tsx` | The warning now explicitly points the user to the **Reconnect / refresh** button below the warning. |
| Reconnect behavior | `src/app/locations/actions.ts` | `refreshGoogleConnection` now validates that the connection belongs to the active organization and then redirects to a fresh Google OAuth consent URL instead of merely refreshing the old underscoped token. |
| Organization isolation | `src/app/locations/actions.ts` | The reconnect action continues to require team-management access and restricts the connection lookup by `organizationId`, preserving the account-isolation fix. |

## Current Database Finding

| Google Account | Organization | Has `business.manage` Scope | Mapped Locations | Result |
|---|---|---:|---:|---|
| `safatash@gmail.com` | NOVA MedMarket | Yes | 0 | Token has the required scope, but no locations are mapped yet. |
| `novaadvertisingmaps@gmail.com` | NOVA MedMarket | No | 0 | Needs reauthorization through the now-visible **Reconnect / refresh** button. |

## Validation Results

| Check | Result |
|---|---|
| `npm run lint` | Passed with 0 errors and 7 pre-existing warnings. |
| `npm run build` | Passed successfully after the patch. |
| Organization scoping | Confirmed the affected `novaadvertisingmaps@gmail.com` connection is attached to NOVA MedMarket, not Nova Dental. |
| Reauthorization path | Confirmed the refresh action now generates a Google OAuth URL with the active NOVA MedMarket organization state and the specific Google connection ID. |

## Required User Action

The user still needs to click **Reconnect / refresh** for `novaadvertisingmaps@gmail.com` and approve the requested Google Business Profile permissions in Google. This is necessary because OAuth scopes cannot be added to an already-issued token by refreshing it; Google must issue a new consented token after the user approves the missing Business Profile permission.
