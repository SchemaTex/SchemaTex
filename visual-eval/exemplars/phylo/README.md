# Phylo variants and example coverage

The eval page declares two branch drawing variants: **slanted** (default) and
**rectangular**. Each has its own `source.sx`, `ideal.svg` and `notes.md`.
`#/phylo` opens slanted; `#/phylo/rectangular` opens rectangular; `#/phylo/all`
shows the complete set. Layout is separate from mode: a slanted phylogram still
preserves horizontal distances, while a cladogram ignores distances and aligns
its tips. Dendrograms keep rectangular merge-height connectors.

The original six cases keep their explicitly authored rectangular layout. Eight
additional cases use mock data, disclosed in the title, goal and source comment.
No actual user trees were available in the local demand summary; none of these
cases represents a user record or an empirical analysis.

| New case | Variant | What it exercises |
|---|---|---|
| Balanced classification | slanted | Eight tips, four sister pairs, topology-only aligned tips |
| Unresolved radiation | slanted | Five-way root split and a nested sister pair |
| Deep sequential branching | slanted | Twelve-tip ladder rather than a balanced tree |
| Unequal evolutionary rates | slanted | Large differences in terminal branch distances |
| Clade support comparison | slanted | Four support values and two annotated clades |
| Two isolates | slanted | Smallest nontrivial tree, default layout without a layout property |
| Contemporaneous samples | rectangular | Six equal root-to-tip durations, chronogram mode |
| Four sample clusters | rectangular | Eight samples, four merge heights and a clustering cut |

These are development examples (`train`), not an independent holdout. Each has a
specific rubric; none has an invented target, human review flag, historical
snapshot or vision score. Missing targets remain visible on the eval page.

The engine iteration reviewed all 14 cases and both exemplar inputs as actual
renders. Labels now share a column, underscores display as spaces, species names
use italics, and the scale-unit caption fits the canvas. Background-highlighted
clades display their name when no separate label is provided. Slanted layout preserves
horizontal branch distances while constraining descendants to their label-row
region, preventing the observed unequal-polytomy crossing. Cladogram spacing
now derives from tree depth instead of a fixed internal-node step.

Two more aggressive layouts were rejected visually: a slope allocation that
made deep trees excessively tall, and an unconditional fan that flattened their
branching. The retained projection preserves ordinary Y positions where possible.
It has no case IDs, example-specific taxon rules, target lookups or new DSL geometry controls.
Generated trees with varying lengths, zero-length edges and balanced/ladder
shapes test distance, planar routing and label separation independently of the
example names. This is an audit, not proof of generalization to every tree.

Limits remain: very short/zero internal branches can crowd support annotations;
long alignment guides can dominate highly unequal or deep distance trees. The
legacy primate source is malformed and omits Gibbon, and the vertebrate source's
named clade does not match its topology. These data issues were not silently
rewritten to improve pictures. Targets and prior version snapshots are unchanged.

Reproduce the page assets with:

```sh
npx vite-node scripts/visual-eval/draw-phylo-exemplar.mts
npx vite-node scripts/visual-eval/exemplars.mts --type phylo
npx vite-node scripts/visual-eval/run.mts --type phylo --split all
```

Using `--split all` also refreshes the two legacy cases already viewed in prior
reviews; those should not be represented as unseen validation data.
