// src/app/f/[slug]/funnel-style-choice.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { chooseFunnelRenderer } from "./funnel-style-choice.ts";

test("AI_GUIDED maps to ai", () => assert.equal(chooseFunnelRenderer("AI_GUIDED"), "ai"));
test("SIMPLE maps to simple", () => assert.equal(chooseFunnelRenderer("SIMPLE"), "simple"));
test("junk maps to simple", () => assert.equal(chooseFunnelRenderer("x"), "simple"));
test("null maps to simple", () => assert.equal(chooseFunnelRenderer(null), "simple"));
