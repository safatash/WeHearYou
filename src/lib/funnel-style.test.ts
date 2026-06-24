import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFunnelStyle, DEFAULT_FUNNEL_STYLE } from "./funnel-style.ts";

test("accepts AI_GUIDED", () => assert.equal(normalizeFunnelStyle("AI_GUIDED"), "AI_GUIDED"));
test("accepts SIMPLE", () => assert.equal(normalizeFunnelStyle("SIMPLE"), "SIMPLE"));
test("falls back to default for junk", () => assert.equal(normalizeFunnelStyle("nope"), DEFAULT_FUNNEL_STYLE));
test("falls back to default for null", () => assert.equal(normalizeFunnelStyle(null), "SIMPLE"));
