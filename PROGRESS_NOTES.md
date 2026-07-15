# Spotlight & Pins Feature - Progress Notes

## Status: In Progress (Phase 3 of 6 - Editor UI)

## What's Done
1. schema.prisma - Added spotlightReviewId, pinnedReviewIds, reviewHighlights, cardHeights
2. Migration file created: prisma/migrations/20260715000000_add_spotlight_pins_highlights/migration.sql
3. actions.ts - Added parsing/saving for all 3 new fields
4. review-widgets.ts - Added to PublicWidgetPayload type + buildWidgetObj + pinned review scatter logic
5. widget-studio-editor.tsx - Added:
   - PickerReview type export
   - spotlightReviewId, pinnedReviewIds, reviewHighlights state
   - availableReviews prop
   - handleSave serialization
   - Spotlight & Pins panel UI (spotlight picker, pinned multi-select, highlights)

## Still TODO
6. widget-studio-editor.tsx - Pass spotlightReviewId to previewSettings
7. widget-mock-preview.tsx - Add spotlight/highlight support to PreviewSettings + rendering
8. route.ts (embed script) - Apply spotlight/highlight in card rendering
9. [id]/page.tsx - Pass availableReviews to WidgetStudioEditor + add new fields to studioWidget
10. Commit + push

## Key Design Decisions
- Spotlight: manual selection, works on both Varied and Uniform layouts (accent bg on Varied, accent border on Uniform)
- Pinned reviews: scattered at evenly-spaced positions (not clustered at top)
- Highlights: per-review, admin pastes exact phrase, rendered as <mark> with accent color
- Spotlight always goes to position 0 in the list (server-side)
- Pinned reviews scattered server-side using step = floor(restCount / (pinnedCount + 1))

## File Locations
- /home/ubuntu/WeHearYou/src/app/widgets/widget-studio-editor.tsx
- /home/ubuntu/WeHearYou/src/app/widgets/[id]/page.tsx
- /home/ubuntu/WeHearYou/src/app/widgets/actions.ts
- /home/ubuntu/WeHearYou/src/components/widget-mock-preview.tsx
- /home/ubuntu/WeHearYou/src/app/embed/widget.js/route.ts
- /home/ubuntu/WeHearYou/src/lib/review-widgets.ts
- /home/ubuntu/WeHearYou/prisma/schema.prisma
