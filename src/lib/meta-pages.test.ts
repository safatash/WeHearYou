import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMetaPages, categorizeMetaPageSelection } from "./meta-pages.ts";

test("normalizeMetaPages maps id/name/access_token from raw account data", () => {
  const pages = normalizeMetaPages([
    { id: "111", name: "Coffee Shop", access_token: "tok-a" },
    { id: "222", name: "Bakery", access_token: "tok-b" },
  ]);
  assert.deepEqual(pages, [
    { id: "111", name: "Coffee Shop", access_token: "tok-a" },
    { id: "222", name: "Bakery", access_token: "tok-b" },
  ]);
});

test("normalizeMetaPages drops entries missing id or access_token", () => {
  const pages = normalizeMetaPages([
    { id: "111", name: "Has token", access_token: "tok-a" },
    { id: "222", name: "No token" },
    { name: "No id", access_token: "tok-c" },
  ]);
  assert.deepEqual(pages, [{ id: "111", name: "Has token", access_token: "tok-a" }]);
});

test("normalizeMetaPages falls back to a default name", () => {
  const pages = normalizeMetaPages([{ id: "111", access_token: "tok-a" }]);
  assert.equal(pages[0].name, "Facebook Page");
});

test("normalizeMetaPages returns [] for non-array input", () => {
  assert.deepEqual(normalizeMetaPages(null), []);
  assert.deepEqual(normalizeMetaPages(undefined), []);
  assert.deepEqual(normalizeMetaPages({}), []);
});

test("categorizeMetaPageSelection: no pages", () => {
  assert.deepEqual(categorizeMetaPageSelection([]), { kind: "none" });
});

test("categorizeMetaPageSelection: exactly one page auto-selects", () => {
  const page = { id: "111", name: "Solo", access_token: "tok" };
  assert.deepEqual(categorizeMetaPageSelection([page]), { kind: "single", page });
});

test("categorizeMetaPageSelection: multiple pages need a picker", () => {
  const pages = [
    { id: "111", name: "A", access_token: "tok-a" },
    { id: "222", name: "B", access_token: "tok-b" },
  ];
  assert.deepEqual(categorizeMetaPageSelection(pages), { kind: "multiple", pages });
});
