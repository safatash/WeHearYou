# Account Isolation Fix Validation

## Summary

The account-isolation issue reported for **Behzad Riazi / safatash@gmail.com** has been investigated and fixed. The root cause was that several authenticated pages and server actions were still using global organization or Google connection queries. As a result, a newly created account could see or interact with seeded/demo records from the first organization in the database.

The fix scopes organization, settings, team, Google connection, widget, and Google review sync paths to the active membership's `organizationId`. The incorrect cross-organization Google connection reference on Behzad's new organization was also removed.

## Root Cause

| Area | Previous behavior | Fixed behavior |
|---|---|---|
| Settings | Loaded the first organization in the database. | Loads the active membership organization only. |
| Team roster | Loaded all memberships globally. | Loads memberships for the active organization only. |
| Team member detail | Looked up a membership by ID without organization scope. | Requires both member ID and active organization ID. |
| Google integrations | Loaded all Google connections globally. | Loads Google connections for the active organization only. |
| Add location from Google | Showed global Google Business Profile connections. | Shows only current organization connections. |
| Google mapping/sync/disconnect actions | Accepted raw Google connection IDs without ownership verification. | Verifies the connection belongs to the active organization before action execution. |
| Widget creation | Used the first organization helper. | Uses the current membership organization. |
| Google review sync service | Could process mismatched connection/location references. | Rejects mismatched cross-organization mappings. |

## Database Cleanup Result

A targeted cleanup removed only the invalid Google connection reference from Behzad's organization/location while preserving the user, organization, and location records.

| Check | Result |
|---|---|
| User | Behzad Riazi / safatash@gmail.com |
| Active organization | NOVA MedMarket |
| Membership | OWNER / ACTIVE |
| Organization users | 1 |
| Organization locations | 1 |
| Organization Google connections | Same-organization connections may exist; no foreign ownership detected in follow-up validation. |
| Foreign mapped locations | 0 |
| Remaining cross-organization location Google connection ID | None detected. |

## Validation Performed

| Validation | Result |
|---|---|
| ESLint | Passed with 7 pre-existing warnings and 0 errors. |
| Production build | Passed successfully. |
| Behzad organization integrity query | Passed: no foreign Google connection references remain. |
| Scoped loader search | Confirmed current call sites pass `membership.organizationId` into settings, team, and Google connection loaders. |
| Local server routes | Login/signup return 200; authenticated routes redirect when unauthenticated as expected. |

## Notes

The current browser session is logged in as the existing **Safa Tash** demo user, so seeing Nova Dental while that session is active is expected. For **Behzad Riazi / safatash@gmail.com**, the scoped data path now resolves to **NOVA MedMarket** only, with one active membership, one accessible location, and no foreign Google mapping.

The `/businesses` directory feature remains unimplemented and was not touched as part of this fix.

## Funnel Builder and Funnel Preview Follow-Up Validation

A follow-up patch closed the remaining funnel-page isolation gap. `src/app/funnel-builder/page.tsx` and `src/app/funnel-preview/page.tsx` now require the active page membership, derive accessible location IDs through `getAccessibleLocationIds(membership)`, and pass that explicit scope into the funnel data helpers. `src/lib/funnels.ts` now requires `locationIds: string[]` for both `getFunnelBuilderData` and `getFunnelPreviewData`, so the location picker, selected funnel, preview simulator, and review sample loading are constrained to the current account’s accessible locations.

| Check | Result |
|---|---|
| ESLint | Passed with 7 pre-existing warnings and 0 errors. |
| Production build | Passed successfully. |
| Funnel loader call sites | Confirmed all `getFunnelBuilderData` and `getFunnelPreviewData` call sites pass an explicit scoped location ID list. |
| Behzad funnel scope query | Passed: Behzad Riazi / safatash@gmail.com resolves to active organization `NOVA MedMarket` only. |
| Funnel Builder scoped locations | Passed: only `NOVA MedMarket` was returned for Behzad’s accessible location scope. |
| Funnel Preview scoped locations | Passed: only `NOVA MedMarket` was returned for Behzad’s accessible location scope; no Nova Dental locations or visible reviews were loaded. |
| Google mapping integrity | Passed: no cross-organization mapped locations remain for Behzad’s organization. |

The current browser session remains logged in as the **Safa Tash** demo user, so the browser showing **Nova Dental** in that session is expected and is not evidence of a Behzad-account leak. The targeted database and loader-scope validation confirms the Behzad account path now resolves to **NOVA MedMarket** only. The deferred `/businesses` directory feature remains untouched pending explicit approval.

