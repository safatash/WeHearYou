import assert from "node:assert/strict";
import test from "node:test";
import { getVisiblePublicReviews } from "./public-profile.ts";

function loc(reviews: unknown[]) {
  return { publicProfile: { showReviews: true }, reviews } as unknown as Parameters<typeof getVisiblePublicReviews>[0];
}
const review = (over: Record<string, unknown>) => ({
  isTestimonial: false, source: "GOOGLE", isFeatured: false, isHiddenFromMiniSite: false, rating: 5, ...over,
});

test("excludes reviews hidden from mini site", () => {
  const result = getVisiblePublicReviews(loc([review({ id: "a" }), review({ id: "b", isHiddenFromMiniSite: true })]));
  assert.deepEqual(result.map((r) => r.id), ["a"]);
});

test("returns featured reviews first", () => {
  const result = getVisiblePublicReviews(loc([
    review({ id: "a", isFeatured: false }),
    review({ id: "b", isFeatured: true }),
  ]));
  assert.deepEqual(result.map((r) => r.id), ["b", "a"]);
});
