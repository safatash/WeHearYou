# Workspace Memory

## Project
**WeHearYou** - A review campaign funnel builder with public/private feedback routing.

## Current Work
- ✅ Fixed campaign-wizard filter settings integration with public funnel
- ✅ Implemented conditional display: Filter OFF = all ratings → thanks page + Google review button
- ✅ Filter ON = ratings 1-3 → feedback form, ratings 4-5 → thanks + Google button
- ✅ Updated thanks page logic to respect filter settings properly

## Architecture Overview
- **Public funnel**: `/f/[slug]` - General public review landing page
- **Token-based funnel**: `/r/[token]` - SMS/campaign-specific review requests
- **Campaign wizard**: `/campaign-wizard` - Admin interface to configure funnel settings
- **Filter logic**: `negativeFilterEnabled` & `negativeFilterThreshold` control routing behavior

## Key Components
- `FunnelRatingForm` - Client component handling star rating interaction
- `submitPublicFunnelRating` - Server action processing form submissions
- `PublicFunnelPage` - Server component fetching location & profile settings
- `PublicFunnelThanksPage` - Thanks/confirmation page with Google review button

## Recent Fixes
1. **Filter settings not applying**: Added `filterEnabled` and `filterThreshold` props to FunnelRatingForm
2. **Thanks page logic error**: Fixed hardcoded `rating < 4` condition to only check `mode === "private"`
3. **Direct submission flow**: When filter OFF, all ratings bypass feedback form

## Testing Notes
- Verify SMS links work correctly (fixed route from `/f/{id}` to `/r/{token}`)
- Test both filter ON and OFF scenarios
- Confirm thanks page shows Google review button in all expected cases
