# Google review field extension

Added minimal richer Google review fields to `Review`:

- `reviewerPhotoUrl`
- `sourceReviewUrl`
- `sourceReplyText`

Why these:
- `reviewerPhotoUrl` helps widgets and public displays feel more authentic
- `sourceReviewUrl` gives you a future path to "View on Google"
- `sourceReplyText` preserves Google's owner reply separately from internal reply workflow

These fields are intentionally minimal and do not replace your existing internal reply workflow fields like:
- `replyDraft`
- `replySentAt`
- `replySentByMembershipId`

## Next step

Run a new Prisma migration for WeHearYou:

```bash
cd /Users/safatash/.openclaw/workspace/wehearyou
npm run prisma:migrate -- --name add_google_review_fields
npm run prisma:generate
```
