import test from "node:test";
import assert from "node:assert/strict";
import { readFunnelStyleField } from "./funnel-style-field.ts";

test("reads AI_GUIDED", () => {
  const fd = new FormData(); fd.set("funnelStyle", "AI_GUIDED");
  assert.equal(readFunnelStyleField(fd), "AI_GUIDED");
});
test("defaults to SIMPLE when absent", () => assert.equal(readFunnelStyleField(new FormData()), "SIMPLE"));
