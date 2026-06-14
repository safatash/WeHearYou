# Rating Styles Consolidation - Test Matrix

**Status**: Ready for manual testing  
**Date**: 2026-06-11  
**Consolidation**: Complete ✅

---

## Quick Verification Checklist

- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test` (if applicable)
- [ ] No TypeScript errors: `npm run typecheck` ✅
- [ ] All 4 routes load without console errors
- [ ] Rating style displays correctly in browser for each mode

---

## Route-by-Route Testing

### Route 1: Public Funnel `/f/[slug]`

**Setup**: Create a location with each rating style in Appearance settings

**Test Case 1.1: Stars Rating Style**
- [ ] Navigate to `/f/[slug]` with stars configured
- [ ] Verify: 5 stars display horizontally
- [ ] Submit 1-star rating
  - [ ] Recovery form appears (threshold=4)
- [ ] Go back, submit 4-star rating
  - [ ] Routes to high-rating destination (choice page or direct)
- [ ] Feedback page shows correct rating display

**Test Case 1.2: Faces Rating Style**
- [ ] Navigate to `/f/[slug]` with faces configured
- [ ] Verify: 😞 😐 😊 display horizontally
- [ ] Submit 😞 (value=1)
  - [ ] Recovery form appears
- [ ] Go back, submit 😊 (value=5)
  - [ ] Routes to high-rating destination
- [ ] Feedback page displays correct emoji

**Test Case 1.3: Thumbs Rating Style**
- [ ] Navigate to `/f/[slug]` with thumbs configured
- [ ] Verify: 👎 👍 display with large spacing
- [ ] Submit 👎 (value=1)
  - [ ] Recovery form appears
- [ ] Go back, submit 👍 (value=5)
  - [ ] Routes to high-rating destination
- [ ] Feedback page shows 👍

**Test Case 1.4: Recovery Form (all modes)**
- [ ] For low rating, recovery form appears
- [ ] Stars mode: shows 5 small stars to re-rate
- [ ] Faces mode: shows emoji buttons
- [ ] Thumbs mode: shows emoji buttons
- [ ] Submit feedback → goes to thanks page
- [ ] Thanks page shows submitted rating in correct style

**Test Case 1.5: Embedded Mode**
- [ ] Navigate to `/f/[slug]?embed=1`
- [ ] Verify: no header/footer, compact styling
- [ ] Submit rating → all redirects preserve `embed=1`

---

### Route 2: Token-Based Funnel `/r/[token]`

**Setup**: Create a campaign with SMS link, try each rating style

**Test Case 2.1: SMS Link with Each Rating Style**
- [ ] Send SMS with `/r/[token]` link
- [ ] Click link in browser
- [ ] Verify: correct rating style displays
- [ ] Submit rating → redirects correctly
- [ ] Recovery form works same as public funnel

**Test Case 2.2: Feedback Page Rating Display**
- [ ] Submit low rating → redirected to `/r/[token]/feedback?rating=X`
- [ ] Stars: shows filled stars up to submitted value
- [ ] Faces: shows correct emoji for value (1→😞, 3→😐, 5→😊)
- [ ] Thumbs: shows 👎 or 👍
- [ ] Fill feedback form → submit
- [ ] Thanks page shows correct rating

---

### Route 3: Direct Review Link `/review/[slug]` ⭐ **Critical Fix**

**Previous Behavior**: Always showed thumbs (hardcoded)  
**New Behavior**: Reads location's Appearance setting

**Test Case 3.1: Stars Rating Style**
- [ ] Configure location with Stars appearance
- [ ] Navigate to `/review/[slug]`
- [ ] Verify: Shows "⭐⭐⭐⭐⭐" vs "⭐⭐" buttons (not thumbs)
- [ ] Click "5 Stars" → goes to Google review link
- [ ] Click "Lower rating" → goes to feedback form

**Test Case 3.2: Faces Rating Style**
- [ ] Configure location with Faces appearance
- [ ] Navigate to `/review/[slug]`
- [ ] Verify: Shows "😊 (Very happy)" vs "😞 (Very unhappy)"
- [ ] Click happy → Google review link
- [ ] Click unhappy → feedback form

**Test Case 3.3: Thumbs Rating Style**
- [ ] Configure location with Thumbs appearance
- [ ] Navigate to `/review/[slug]`
- [ ] Verify: Shows "👍 (Thumbs up)" vs "👎 (Thumbs down)"
- [ ] Click thumbs up → Google review link
- [ ] Click thumbs down → feedback form

**Test Case 3.4: URL Parameters**
- [ ] Test with `src`, `medium`, `placement` parameters
- [ ] Verify: all parameters preserved in redirects

---

### Route 4: Campaign Wizard Live Preview

**Test Case 4.1: Appearance Step - Stars**
- [ ] Open campaign-wizard, go to Appearance step
- [ ] Select "Stars" rating style
- [ ] Verify: Live preview shows ★★★★★
- [ ] Adjust threshold (2-5 stars)
- [ ] Verify: Preview updates threshold text correctly

**Test Case 4.2: Appearance Step - Faces**
- [ ] Select "Faces" rating style
- [ ] Verify: Live preview shows 😞 😐 😊
- [ ] Toggle between "Happy only" (5) and "Neutral+" (3)
- [ ] Verify: Preview updates threshold logic

**Test Case 4.3: Appearance Step - Thumbs**
- [ ] Select "Thumbs" rating style
- [ ] Verify: Live preview shows 👎 👍
- [ ] Verify: No threshold adjustment available (fixed at 👍 = high)

**Test Case 4.4: Review Routing Step**
- [ ] For each rating style, go to Review Routing step
- [ ] Stars: shows "High ratings start at X stars" slider
- [ ] Faces: shows "Which faces count as high ratings?" toggle
- [ ] Thumbs: shows "👎 = low · 👍 = high" text (no adjustment)
- [ ] Verify: Preview legend updates based on routing config

**Test Case 4.5: Save & Go Live**
- [ ] Configure each rating style
- [ ] Click "Save campaign"
- [ ] Open live funnel link → verify correct style shows
- [ ] Open preview → verify matches wizard

---

## Threshold Edge Cases

### Faces Mode Thresholds
This is the most complex case due to discrete values.

**Test Case 5.1: Faces with Threshold 3 (Neutral+)**
- [ ] Set threshold = 3
- [ ] Submit 😞 (value=1) → low (recovery)
- [ ] Submit 😐 (value=3) → high (review destination) ✓ Edge case
- [ ] Submit 😊 (value=5) → high (review destination)

**Test Case 5.2: Faces with Threshold 5 (Happy Only)**
- [ ] Set threshold = 5
- [ ] Submit 😞 (value=1) → low (recovery)
- [ ] Submit 😐 (value=3) → low (recovery) ✓ Edge case
- [ ] Submit 😊 (value=5) → high (review destination)

---

## Regression Testing

**Test Case 6.1: Public Review Routing Still Works**
- [ ] High rating → choice page appears (if multiple destinations)
- [ ] High rating → direct redirect (if single destination)
- [ ] Low rating → recovery form (PRIVATE) or custom URL (CUSTOM)

**Test Case 6.2: Email/SMS Campaign Links**
- [ ] Send automated SMS → `/r/[token]` link
- [ ] Send automated email → `/r/[token]` link
- [ ] Rating works correctly with callback to server
- [ ] Analytics recorded for each submission

**Test Case 6.3: Funnel Builder Preview**
- [ ] Open `/funnel-preview?location=[id]`
- [ ] Verify: rating style dropdown works
- [ ] Verify: all 3 rating styles render correctly in preview
- [ ] Verify: branch selection works
- [ ] Verify: "Open live funnel" link uses correct `/f/[slug]`

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Check**:
- [ ] Rating buttons clickable on mobile
- [ ] Large emoji render clearly
- [ ] Stars don't blur/pixelate
- [ ] No layout shifts

---

## Visual Consistency

| Element | Stars | Faces | Thumbs |
|---------|-------|-------|--------|
| Main rating buttons | 60px SVG | 5xl emoji | 6xl emoji |
| Recovery form stars | 32px SVG | 3xl emoji | 3xl emoji |
| Feedback page display | 32px SVG | 5xl emoji | 5xl emoji |
| Campaign preview | 20px SVG | base emoji | lg emoji |
| Choice buttons (yes/no) | ⭐⭐⭐⭐⭐ | 😊 | 👍 |

---

## Known Behaviors to Verify

1. **Rating values submitted to server**: 1-5 for all modes
   - Stars: 1, 2, 3, 4, 5
   - Faces: 1, 3, 5
   - Thumbs: 1, 5
   
2. **Threshold comparison**: `rating >= threshold` (numeric, no mode-specific logic)

3. **Recovery form trigger**: Shown when `rating < threshold` and `lowRatingDestination === "PRIVATE"`

4. **Custom recovery URL**: Shown when `lowRatingDestination === "CUSTOM"` and `rating < threshold`

5. **Facial rating threshold**:
   - Default: 4 (same as stars)
   - Can be set to 3 (neutral+happy) or 5 (happy only)
   - Not 1 or 2 (would be illogical)

---

## Smoke Tests (Quick)

Run these to catch major issues:

```bash
# 1. Type check (done)
npm run typecheck

# 2. Build (optional, takes time)
npm run build

# 3. Manual: Visit each URL once with each rating style
# /f/[slug] with stars
# /f/[slug] with faces
# /f/[slug] with thumbs
# /r/[token] same as above
# /review/[slug] same as above
# /campaign-wizard (appearance step)
```

---

## Sign-Off

- [ ] All test cases above pass
- [ ] No console errors in browser DevTools
- [ ] No regressions in existing funnel behavior
- [ ] Ready to deploy

**Tested by**: _________  
**Date**: _________  
**Environment**: development / staging / production
