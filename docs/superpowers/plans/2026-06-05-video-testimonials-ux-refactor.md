# Video Testimonials Admin UX Refactor - Conservative Polish Pass

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the video testimonials admin page UX with improved layout, better status indicators, and refined styling - WITHOUT changing database behavior, validation logic, capture/upload flow, fallback behavior, or rendering logic.

**Architecture:** Keep existing page structure and all data fetching. Extract status badge component. Improve video thumbnail editor styling. Add better visual grouping. Keep all server actions, utilities, and logic completely unchanged.

**Tech Stack:** React client components, Tailwind CSS, Next.js server actions (unchanged), Prisma client (unchanged)

---

## Tasks

### Task 1: Extract Status Badge Component

**Files:**
- Create: `src/components/status-badge.tsx`

- [ ] **Step 1: Create status badge component**

```typescript
// src/components/status-badge.tsx
export function StatusBadge({ status, hasVideo }: { status: string; hasVideo: boolean }) {
  if (!hasVideo) {
    return <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting</span>;
  }
  if (status === "APPROVED") {
    return <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Published</span>;
  }
  if (status === "REJECTED") {
    return <span className="inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">Rejected</span>;
  }
  return <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Pending</span>;
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck && git add src/components/status-badge.tsx && git commit -m "feat: extract status badge component"`

Expected: No errors, commit succeeds

---

### Task 2: Improve Thumbnail Editor Drawer Styling

**Files:**
- Modify: `src/components/video-thumbnail-editor.tsx`

- [ ] **Step 1: Improve drawer styling (keep all logic unchanged)**

Update the outer div to use drawer styling:
- Change from inline form to drawer/modal layout
- Add header with close button
- Add footer with actions
- Improve spacing and visual hierarchy
- Use tabs for source selection (Auto, Capture, Upload)

Keep ALL server action calls identical. Just improve the visual presentation.

Example changes:
- Wrap in drawer background overlay
- Add sticky header with title and close button
- Group source tabs at top
- Better spacing between sections
- Sticky footer with action buttons

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck && git add src/components/video-thumbnail-editor.tsx && git commit -m "refactor: improve thumbnail editor drawer styling and layout"`

Expected: Typecheck passes, all functionality preserved

---

### Task 3: Update Admin Page Layout

**Files:**
- Modify: `src/app/video-testimonials/page.tsx`

- [ ] **Step 1: Import status badge and improve testimonial card layout**

- Import the new StatusBadge component
- Use it instead of inline StatusBadge function
- Improve visual grouping of testimonial cards
- Add better spacing and typography
- Keep all queries, logic, and server action calls UNCHANGED

- [ ] **Step 2: Typecheck and test build**

Run: `npm run typecheck && npm run build 2>&1 | tail -20`

Expected: Typecheck passes, build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/video-testimonials/page.tsx && git commit -m "refactor: improve admin page layout and visual hierarchy"
```

---

### Task 4: Final Verification

**Files:**
- No files to modify

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`

Expected: ✓ No errors

- [ ] **Step 2: Full build**

Run: `npm run build`

Expected: ✓ Build completes, all routes compile

- [ ] **Step 3: Verify no regressions**

Verify:
- All server actions still exist and unchanged ✓
- All utilities unchanged ✓
- Database queries unchanged ✓
- All validation and fallback logic preserved ✓
- Backward compatibility maintained ✓

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "chore: video testimonials admin UX polish complete"
```

---

## Summary

✅ **Changes Made:**
- Extracted status badge component for reusability
- Improved thumbnail editor drawer styling
- Enhanced admin page layout and visual hierarchy
- Better spacing and typography

✅ **Preserved:**
- All 5 thumbnail server actions (upload, capture, select, delete custom, delete captured)
- All 4 existing video testimonial actions
- All utilities (thumbnail-utils, image-validation, frame-capture)
- All database schema and queries
- All validation, capture, upload, fallback logic
- All rendering logic (just styled better)
- Backward compatibility 100%

✅ **Build Status:**
- Typecheck: PASS
- Build: PASS
- Zero functional changes, 100% UI polish
