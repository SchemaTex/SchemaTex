#!/usr/bin/env node
/** Flags targets that do not draw their own case's subject.
 *
 *   node scripts/visual-eval/check-subject.mjs [ids-file]
 *
 * Model-drafted targets occasionally come back drawing a *sibling* case of the
 * same diagram type — a hotel floor where a hospital ward was asked for. The
 * signal is vocabulary: words common across the corpus are DSL keywords, words
 * rare in it are this drawing's own content, so a target that shares little
 * vocabulary with its source is drawing something else. Floor plans and site
 * plans score low honestly (their symbols carry meaning the text never names),
 * and CJK sources score low because the token pattern is Latin — check a flag
 * by eye before acting on it.
 */
/** Does each target actually draw its own source's subject?
 *  Words that identify a subject are the ones rare across the corpus: a token in
 *  many sources is DSL vocabulary, a token in few is this drawing's content. */
import { readdirSync, readFileSync, existsSync } from "node:fs";
const ids = readdirSync("visual-eval/cases", { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
const words = s => (s.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []);
const df = new Map();
const srcs = new Map();
for (const id of ids) {
  const p = `visual-eval/cases/${id}/source.sx`;
  if (!existsSync(p)) continue;
  const s = readFileSync(p, "utf8");
  srcs.set(id, s);
  for (const w of new Set(words(s))) df.set(w, (df.get(w) ?? 0) + 1);
}
const common = new Set([...df].filter(([, n]) => n > srcs.size * 0.06).map(([w]) => w));
const want = process.argv[2] ? readFileSync(process.argv[2], "utf8").trim().split("\n") : [...srcs.keys()];
for (const id of want) {
  const svgP = `visual-eval/cases/${id}/ideal.svg`;
  if (!existsSync(svgP)) continue;
  const text = new Set(words([...readFileSync(svgP, "utf8").matchAll(/>([^<>]+)</g)].map(m => m[1]).join(" ")));
  const distinctive = [...new Set(words(srcs.get(id)))].filter(w => !common.has(w));
  if (distinctive.length < 6) continue;
  const hit = distinctive.filter(w => text.has(w)).length;
  const pct = hit / distinctive.length;
  if (pct < 0.35) console.log(`${(pct * 100).toFixed(0).padStart(3)}%  ${id.padEnd(44)} ${hit}/${distinctive.length} of its own words appear`);
}
