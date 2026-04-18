#!/usr/bin/env node
// Generate example SVGs for Venn / Euler diagrams.
// Reads fixtures from tests/fixtures/venn/ and writes SVG to examples/venn/.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { renderVenn } from "../../src/diagrams/venn/renderer.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "..", "tests", "fixtures", "venn");
const outDir = __dirname;

mkdirSync(outDir, { recursive: true });
const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".txt"));
for (const f of files) {
  const txt = readFileSync(join(fixturesDir, f), "utf8");
  try {
    const svg = renderVenn(txt);
    const out = join(outDir, basename(f, ".txt") + ".svg");
    writeFileSync(out, svg);
    console.log("wrote", out);
  } catch (e) {
    console.error("failed", f, e.message);
  }
}
