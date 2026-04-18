#!/usr/bin/env node
// Generate example SVGs for Flowchart diagrams.
// Reads fixtures from tests/fixtures/flowchart/ and writes SVG to examples/flowchart/.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { renderFlowchart } from "../../src/diagrams/flowchart/renderer.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "..", "tests", "fixtures", "flowchart");
const outDir = __dirname;

mkdirSync(outDir, { recursive: true });
const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".txt"));
for (const f of files) {
  const txt = readFileSync(join(fixturesDir, f), "utf8");
  try {
    const svg = renderFlowchart(txt);
    const out = join(outDir, basename(f, ".txt") + ".svg");
    writeFileSync(out, svg);
    console.log("wrote", out);
  } catch (e) {
    console.error("failed", f, e.message);
  }
}
