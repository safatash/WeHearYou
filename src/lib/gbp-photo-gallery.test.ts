import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// The published gallery was unreachable until a photo actually published to
// Google, so this never ran: an inline closure passed as a form `action` from a
// Server Component is rejected at render time with "Functions cannot be passed
// directly to Client Components". The page 500s for everyone the moment the
// first photo goes live — exactly when the feature starts working.
test("the gallery's delete form submits to a server action, not a bare closure", () => {
  const page = readFileSync(new URL("../app/gbp/photos/page.tsx", import.meta.url), "utf8");

  for (const match of page.matchAll(/<form\s+action=\{async[^>]*?\}\}?>/g)) {
    assert.match(
      match[0],
      /"use server"/,
      `inline form action must be a server action: ${match[0]}`,
    );
  }

  // The delete control specifically — it only renders once a photo is published.
  assert.match(page, /action=\{async \(fd\) => \{ "use server"; await deleteGbpPhotoAction\(fd\); \}\}/);
});
