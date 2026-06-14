# Rating Styles Consolidation - Test Plan

## Overview
This document verifies that rating styles (stars, faces, thumbs) are consolidated into a shared source of truth and work consistently across all entry points.

**Date**: 2026-06-11

---

## Changes Made

### 1. Created Shared Utility: `src/lib/rating-styles.ts`
- Centralized `RATING_MODES` definition (stars, faces, thumbs)
- `getRatingOptions()` - returns options for a given mode
- `normalizeRatingMode()` - validates and normalizes mode strings
- `getRatingDisplay()` - gets icon for a rating value
- `isHighRating()` - determines if rating meets threshold for routing

### 2. Created Shared Component: `src/components/rating-display.tsx`
- `RatingDisplay` - displays a submitted rating using the correct style
- `StarRatingInput` - reusable star rating input component
- `EmojiRatingInput` - reusable emoji (faces/thumbs) rating input component

### 3. Updated Routes to Use Shared Utilities

| Route | Changes |
|-------|---------|
| `/f/[slug]` | Removed `liveRatingModes` constant, uses `normalizeRatingMode()` + `getRatingOptions()` |
| `/r/[token]` | Removed `liveRatingModes` constant, uses shared utilities |
| `/review/[slug]` | Now reads `publicProfile.funnelRatingStyle` instead of hardcoding thumbs |
| `/r/[token]/feedback` | Uses new `RatingDisplay` component instead of inline logic |
| Campaign Wizard | Updated preview to use `RATING_MODES` constant |

---

## Test Matrix

### Test 1: Stars Rating Style

| Scenario | Route | Expected Behavior |
|----------|-------|-------------------|
| View campaign | `/campaign-wizard` | Preview shows 5 stars |
| Submit 3-star rating | `/f/[slug]` | Shows recovery form (below threshold=4) |
| Submit 5-star rating | `/f/[slug]` | Redirects to configured high-rating destination |
| View feedback page | `/r/[token]/feedback` | Display shows 3-star rating |
| Routing decision | Both routes | Rating ≥ 4 = high; < 4 = low |

### Test 2: Faces Rating Style

| Scenario | Route | Expected Behavior |
|----------|-------|-------------------|
| View campaign | `/campaign-wizard` | Preview shows 😞 😐 😊 |
| Change threshold | Campaign Wizard | Can switch between "Happy only" (5) vs "Neutral+" (3) |
| Submit 😞 (value=1) | `/f/[slug]` | Always shows recovery form (1 < threshold) |
| Submit 😐 (value=3) | `/f/[slug]` | Shows recovery form if threshold=5; routes if threshold=3 |
| Submit 😊 (value=5) | `/f/[slug]` | Always routes to high-rating destination |
| View feedback page | `/r/[token]/feedback` | Display shows correct emoji for submitted value |
| /review/[slug] | New choice page | Shows 😊 (happy) vs 😞 (unhappy) buttons |

### Test 3: Thumbs Rating Style

| Scenario | Route | Expected Behavior |
|----------|-------|-------------------|
| View campaign | `/campaign-wizard` | Preview shows 👎 👍 |
| Submit 👎 (value=1) | `/f/[slug]` | Shows recovery form (1 < 5) |
| Submit 👍 (value=5) | `/f/[slug]` | Routes to high-rating destination |
| View feedback page | `/r/[token]/feedback` | Display shows correct emoji (👎 or 👍) |
| /review/[slug] | Updated choice page | Shows 👍 (thumbs up) vs 👎 (thumbs down) |
| Threshold in UI | Campaign Wizard | Shows "👎 = low · 👍 = high" |

### Test 4: Route Integration - Token-Based (/r/[token])

For each rating style with a campaign link:

1. Click SMS/email link to `/r/[token]`
2. Select rating in matching style (stars/faces/thumbs)
3. Verify routing:
   - **Low rating**: shows recovery form (if threshold met) or custom URL redirect
   - **High rating**: goes to choice page or direct destination
4. Verify feedback page displays correct icon

### Test 5: Route Integration - Direct Link (/f/[slug])

For each rating style with public funnel link:

1. Visit `/f/[slug]`
2. See rating style from location's Appearance setting
3. Select rating matching style
4. Verify routing behavior same as token routes
5. If embed=1: verify styling

### Test 6: Direct Review Link (/review/[slug])

For each rating style on direct review link page:

1. Visit `/review/[slug]`
2. Verify buttons match the location's Appearance setting:
   - **Stars**: shows "5 Stars" vs "Lower rating"
   - **Faces**: shows 😊 vs 😞
   - **Thumbs**: shows 👍 vs 👎
3. Happy button goes to `/review/[slug]/google`
4. Unhappy button goes to `/review/[slug]/feedback`

### Test 7: Campaign Wizard Preview

For each rating style:

1. Open campaign-wizard
2. Switch to Appearance step
3. Select rating style (stars/faces/thumbs)
4. Verify live preview updates immediately
5. Adjust threshold (if applicable)
6. Verify preview shows correct high/low routing indicators

---

## Verification Checklist

- [ ] All routes load without errors
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Stars mode works on all 4 routes
- [ ] Faces mode works on all 4 routes (test both thresholds: 3 and 5)
- [ ] Thumbs mode works on all 4 routes
- [ ] /review/[slug] now reads Appearance setting (not hardcoded thumbs)
- [ ] Campaign wizard preview uses shared RATING_MODES
- [ ] No duplicate rating mode definitions remain in codebase
- [ ] Routing comparison logic correctly handles:
  - Stars: 1-5 numeric values with configurable threshold
  - Faces: 1/3/5 discrete values with threshold 3 or 5
  - Thumbs: 1 (down) / 5 (up) with fixed threshold 5
- [ ] RatingDisplay component correctly renders all modes
- [ ] Feedback page displays correct icon for all rating values

---

## Known Limitations

- Recovery form in `/f/[slug]` still has inline star rendering for recovery form (not consolidated yet, as styling differs significantly from main form)
- Does not consolidate rating input components yet (stars/emoji buttons still inline in FunnelRatingForm and TokenRatingForm)

---

## Future Improvements

1. Further consolidate recovery form star rendering using StarRatingInput component
2. Extract FunnelRatingForm and TokenRatingForm into a shared component
3. Add integration tests for rating routing logic with different thresholds
