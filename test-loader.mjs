/**
 * Node.js ESM loader for unit tests.
 * - Resolves @/ path aliases to src/
 * - Stubs out @prisma/client and @/lib/prisma so pure-logic tests
 *   can run without a live database connection.
 */
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

// Register this loader so it applies to all subsequent imports
register(import.meta.url, { parentURL: pathToFileURL(process.cwd() + "/") });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

// Prisma enum values used in tests
const PRISMA_ENUMS = {
  ReviewLinkEventType: {
    LINK_VIEWED: "LINK_VIEWED",
    HAPPY_CLICKED: "HAPPY_CLICKED",
    UNHAPPY_CLICKED: "UNHAPPY_CLICKED",
    GOOGLE_REDIRECT_CLICKED: "GOOGLE_REDIRECT_CLICKED",
    FEEDBACK_STARTED: "FEEDBACK_STARTED",
    FEEDBACK_SUBMITTED: "FEEDBACK_SUBMITTED",
    MINISITE_VIEWED: "MINISITE_VIEWED",
    MINISITE_CLICK_REVIEW: "MINISITE_CLICK_REVIEW",
    MINISITE_CLICK_CALL: "MINISITE_CLICK_CALL",
    MINISITE_CLICK_WEBSITE: "MINISITE_CLICK_WEBSITE",
    MINISITE_CLICK_DIRECTIONS: "MINISITE_CLICK_DIRECTIONS",
    MINISITE_CLICK_CTA: "MINISITE_CLICK_CTA",
  },
  ReviewStatus: {
    PUBLISHED: "PUBLISHED",
    PENDING: "PENDING",
    HIDDEN: "HIDDEN",
  },
};

const PRISMA_STUB_URL = "data:text/javascript," + encodeURIComponent(
  Object.entries(PRISMA_ENUMS)
    .map(([key, val]) => `export const ${key} = ${JSON.stringify(val)};`)
    .join("\n") + "\nexport const Prisma = {};"
);

const PRISMA_DB_STUB_URL = "data:text/javascript," + encodeURIComponent(
  `export const prisma = {};`
);

export async function resolve(specifier, context, nextResolve) {
  // Stub @prisma/client
  if (specifier === "@prisma/client") {
    return { url: PRISMA_STUB_URL, shortCircuit: true };
  }

  // Stub @/lib/prisma
  if (specifier === "@/lib/prisma") {
    return { url: PRISMA_DB_STUB_URL, shortCircuit: true };
  }

  // Map @/ aliases to absolute file URLs
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2); // strip "@/"
    const abs = path.join(ROOT, "src", rel);
    if (fs.existsSync(`${abs}.ts`)) {
      return { url: pathToFileURL(`${abs}.ts`).href, shortCircuit: true };
    }
    return nextResolve(pathToFileURL(abs).href, context);
  }

  // Handle extensionless relative .ts imports (e.g., "./review-link-analytics")
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : fileURLToPath(import.meta.url);
    const dir = path.dirname(parentPath);
    const candidate = path.join(dir, specifier);
    if (fs.existsSync(`${candidate}.ts`)) {
      return { url: pathToFileURL(`${candidate}.ts`).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  return nextLoad(url, context);
}
