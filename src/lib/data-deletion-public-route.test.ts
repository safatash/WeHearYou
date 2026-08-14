import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxySource = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
const deletionPageSource = readFileSync(new URL("../app/data-deletion/page.tsx", import.meta.url), "utf8");

test("the Meta data-deletion instructions route is public", () => {
  assert.match(proxySource, /req\.nextUrl\.pathname === "\/data-deletion"/);
});

test("the Meta data-deletion page gives a supported request channel without rendering account data", () => {
  assert.match(deletionPageSource, /Data Deletion Instructions/);
  assert.match(deletionPageSource, /safa@novaadvertising\.com/);
  assert.doesNotMatch(deletionPageSource, /prisma\.|getCurrentMembership|require[A-Z]/);
});
