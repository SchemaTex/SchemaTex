#!/usr/bin/env node
/**
 * CI gate — parse & render every bundled example. Fails unless every example is
 * semantically valid; warnings are not considered a clean corpus.
 * Run after build (`npm run build`) so dist/ai is populated.
 */
import {
  listDiagrams,
  getExamples,
  renderDsl,
  validateDsl,
} from "../dist/ai/index.js";

let total = 0;
let failed = 0;
const failures = [];

for (const d of listDiagrams()) {
  const res = getExamples(d.type, { limit: 100 });
  for (const ex of res.examples) {
    total++;
    const validation = validateDsl(d.type, ex.dsl);
    const rendered = renderDsl(d.type, ex.dsl);
    if (
      !validation.ok ||
      validation.status !== "valid" ||
      !rendered.ok ||
      rendered.status !== "valid"
    ) {
      failed++;
      const issues = validation.ok
        ? validation.warnings
        : validation.errors;
      failures.push({ slug: ex.slug, type: d.type, issues });
      console.error(
        `✗ ${ex.slug} (${d.type}) — validation=${validation.status}, render=${rendered.status}`
      );
      for (const issue of issues) {
        const loc = issue.line
          ? ` [line ${issue.line}${issue.column ? `:${issue.column}` : ""}]`
          : "";
        console.error(`    [${issue.code}] ${issue.message}${loc}`);
        if ("source" in issue && issue.source) {
          console.error(`    source: ${issue.source}`);
        }
      }
    } else {
      console.log(`✓ ${ex.slug}`);
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${total} examples were invalid or emitted warnings.`);
  process.exit(1);
}
console.log(`\nAll ${total} examples render cleanly.`);
