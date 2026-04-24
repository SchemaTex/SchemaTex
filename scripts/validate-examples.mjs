#!/usr/bin/env node
/**
 * CI gate — parse & render every bundled example. Fails on any error.
 * Run after build (`npm run build`) so dist/ai is populated.
 */
import { listDiagrams, getExamples, renderDsl } from "../dist/ai/index.js";

let total = 0;
let failed = 0;
const failures = [];

for (const d of listDiagrams()) {
  const res = getExamples(d.type, { limit: 100 });
  for (const ex of res.examples) {
    total++;
    const r = renderDsl(d.type, ex.dsl);
    if (!r.ok) {
      failed++;
      failures.push({ slug: ex.slug, type: d.type, errors: r.errors });
      console.error(`✗ ${ex.slug} (${d.type})`);
      for (const err of r.errors) {
        const loc = err.line ? ` [line ${err.line}${err.column ? `:${err.column}` : ""}]` : "";
        console.error(`    ${err.message}${loc}`);
        if (err.source) console.error(`    source: ${err.source}`);
      }
    } else {
      console.log(`✓ ${ex.slug}`);
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${total} examples failed to render.`);
  process.exit(1);
}
console.log(`\nAll ${total} examples render cleanly.`);
