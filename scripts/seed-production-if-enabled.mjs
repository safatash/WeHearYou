import { spawnSync } from "node:child_process";

const enabled = process.env.RUN_PRODUCTION_SEED_ON_BUILD === "true";

if (!enabled) {
  console.log("Production seed skipped; RUN_PRODUCTION_SEED_ON_BUILD is not true.");
  process.exit(0);
}

console.log("RUN_PRODUCTION_SEED_ON_BUILD=true detected; running Prisma seed once for this deployment.");

const result = spawnSync("node", ["prisma/seed.mjs"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
