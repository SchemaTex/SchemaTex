#!/usr/bin/env node
/** Where every diagram stands between its exemplar and its case targets.
 *
 *   node scripts/visual-eval/exemplar-status.mjs
 *
 * A case target's job is to repeat its variant's exemplar on a new subject, so
 * the question that matters is whether each target was drawn with the exemplar
 * in front of it — recorded in goal.ideal.notes when propose-target drafts one.
 * The report groups variants into: targets already follow the exemplar (ready
 * for engine work), targets predate it (redraw, noting which would discard a
 * human review), no exemplar yet (draw that first), and exemplars no case uses.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
const variants = JSON.parse(readFileSync("visual-eval/variants.json", "utf8"));
const cases = readdirSync("visual-eval/cases", { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort();

const key = (t, v) => (v ? `${t}/${v}` : t);
const hasExemplar = (t, v) => existsSync(`visual-eval/exemplars/${key(t, v)}/ideal.svg`);

const groups = new Map();
for (const id of cases) {
  const g = JSON.parse(readFileSync(`visual-eval/cases/${id}/goal.json`, "utf8"));
  const k = key(g.type, g.variant);
  if (!groups.has(k)) groups.set(k, { type: g.type, variant: g.variant, ex: hasExemplar(g.type, g.variant), cases: [] });
  const notes = g.ideal?.notes ?? "";
  groups.get(k).cases.push({
    id,
    target: Boolean(g.ideal),
    fromExemplar: /exemplar/.test(notes) && !/no exemplar/.test(notes),
    reviewed: g.ideal?.reviewed === true,
    source: g.ideal?.source ?? "-",
  });
}

// variants declared but with no case at all
const orphanExemplars = [];
for (const [t, list] of Object.entries(variants)) {
  for (const v of list) if (hasExemplar(t, v.id) && !groups.has(key(t, v.id))) orphanExemplars.push(key(t, v.id));
}
for (const t of readdirSync("visual-eval/exemplars")) {
  if (!variants[t] && hasExemplar(t, undefined) && !groups.has(t)) orphanExemplars.push(t);
}

const ready = [], stale = [], noEx = [];
for (const [k, g] of [...groups].sort()) {
  const n = g.cases.length;
  const done = g.cases.filter((c) => c.target && c.fromExemplar).length;
  const rev = g.cases.filter((c) => c.reviewed).length;
  const row = { k, n, done, rev, missing: g.cases.filter((c) => !c.target).length };
  row.staleReviewed = g.cases.filter((c) => c.target && !c.fromExemplar && c.reviewed).length;
  row.staleFree = g.cases.filter((c) => !c.fromExemplar && !c.reviewed).length;
  if (!g.ex) noEx.push(row);
  else if (done === n) ready.push(row);
  else stale.push(row);
}
const fmt = (r) => `  ${r.k.padEnd(28)} ${String(r.done).padStart(2)}/${String(r.n).padEnd(2)} drawn from exemplar` +
  (r.rev ? `   (${r.rev} reviewed)` : "") + (r.missing ? `   ${r.missing} with no target at all` : "");

console.log(`A. exemplar done, every target drawn from it — ${ready.length} variants, ${ready.reduce((s, r) => s + r.n, 0)} cases`);
ready.forEach((r) => console.log(fmt(r)));
const b1 = stale.filter((r) => r.staleFree && !r.staleReviewed);
const b2 = stale.filter((r) => r.staleReviewed);
console.log(`\nB1. exemplar done, stale targets that are UNREVIEWED — safe to redraw: ${b1.reduce((s, r) => s + r.staleFree, 0)} cases`);
b1.forEach((r) => console.log(`  ${r.k.padEnd(28)} ${r.staleFree} of ${r.n}`));
console.log(`\nB2. exemplar done, stale targets that are REVIEWED — redrawing discards the review: ${b2.reduce((s, r) => s + r.staleReviewed, 0)} cases (+${b2.reduce((s, r) => s + r.staleFree, 0)} unreviewed alongside)`);
b2.forEach((r) => console.log(`  ${r.k.padEnd(28)} ${r.staleReviewed} reviewed, ${r.staleFree} unreviewed, of ${r.n}`));
console.log(`\nC. no exemplar yet — ${noEx.length} variants, ${noEx.reduce((s, r) => s + r.n, 0)} cases`);
noEx.forEach((r) => console.log(fmt(r)));
console.log(`\nD. exemplar drawn but no case uses it — ${orphanExemplars.length}`);
orphanExemplars.sort().forEach((k) => console.log(`  ${k}`));
