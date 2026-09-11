# Visual Eval — the goal-driven rendering loop

A way to work on a diagram engine by stating what the picture should look like
*before* changing any code, then checking each attempt against that statement.

Without it, "does this drawing look right?" is answered by whoever happens to be
looking, once, and the answer is forgotten. With it, the answer is written down
per rule, per version, and you can see whether today's engine is better or worse
than the last release.

---

## The loop

1. **Write the goal.** One case = one DSL source plus a rubric: a list of rules,
   each phrased so that a person looking at the picture can say yes or no.
2. **Freeze the current release** as a snapshot, so there is something to
   compare against.
3. **Change the engine.**
4. **Render and grade.** Every case is rendered by the working tree and, if the
   judge is on, shown to a vision model that answers each rule pass / fail /
   unclear.
5. **Read the page.** Side-by-side images, per-rule verdicts, and the score
   delta against the release.
6. **Keep what improved**, and write a normal unit test for it so it cannot
   silently regress.

Step 6 is not optional. The judge tells you *whether* a picture got better; only
a test keeps it that way.

---

## Commands

```bash
# Freeze the current engine output as a named version (run at a release commit)
npm run eval:snapshot -- --label v1.0.14

# Render everything with the working tree; add --judge to grade it
npm run eval
npm run eval -- --type logic --judge

# Read the result: start the preview server, then open the tool
npx vite --port 3031 --config vite.preview.config.ts .
open http://127.0.0.1:3031/tools/eval/index.html

# Check the tool in a real browser and capture its screenshots
npm run eval:verify
```

`npm run eval` accepts `--case <id>`, `--type <diagram type>`, `--judge`,
`--model <codex model>`, `--effort low|medium|high`.

---

## Files

| Path | What it holds |
|---|---|
| `visual-eval/cases/<id>/goal.json` | The rubric and the case metadata |
| `visual-eval/cases/<id>/source.sx` | The DSL input, unchanged between versions |
| `visual-eval/cases/<id>/ideal.svg` | Optional reference drawing (see below) |
| `visual-eval/cases/<id>/snapshots/<label>/` | A frozen past render plus the commit it came from |
| `visual-eval/variants.json` | The types that can be drawn more than one way, and their variants |
| `visual-eval/exemplars/<type>/[<variant>/]` | One hand-drawn exemplar per variant: `source.sx`, `ideal.svg`, `notes.md` |
| `scripts/visual-eval/lib.mts` | Case loading, rendering, rasterising |
| `scripts/visual-eval/run.mts` | The orchestrator; writes `report.json` |
| `scripts/visual-eval/exemplars.mts` | Renders each exemplar's source beside its drawing; writes `exemplars.json` |
| `scripts/visual-eval/judge.mjs` | The vision judge |
| `scripts/visual-eval/propose-target.mjs` | Drafts a target drawing with Codex |
| `tools/eval/` | The review tool — a small React app served by the preview server |
| `scripts/visual-eval/verify.mjs` | Browser check for the tool |
| `preview/visual-eval/report.json` | **The contract.** Everything else is a view of this |

`report.json` is the interface between the machinery and the viewer. The tool
fetches it and `exemplars.json` at runtime, and bundles `variants.json` and the
diagram registry (for each type's cluster); a CI comment or a diff bot would
read the same files.

The tool is React because the corpus is meant to reach every diagram type, and
at that size the review surface needs routes — `#/` (the coverage board),
`#/exemplars`, `#/<type>`, `#/<type>/<variant>` and `#/<type>[/<variant>]/<case>` —
a search box and filters — state that is tedious to hand-roll. It builds through
the preview server's own esbuild JSX transform, so it adds no dependency.

---

## Writing a rubric

A rule earns its place only if someone looking at the rendered image can answer
it without reading the DSL or the source code.

- **Good:** "No connecting line passes through the inside of a gate symbol."
- **Bad:** "The routing algorithm avoids obstacles." (Not visible. That is a
  unit test, not a rubric rule.)
- **Bad:** "The diagram looks professional." (Not answerable. Two readers will
  disagree, and so will the judge on two different runs.)

Each rule carries a severity that sets its weight in the score:
`blocker` (4) — the drawing is wrong, not just ugly; `major` (2) — a
professional would object; `minor` (1) — polish.

A case's score is the share of weight that passed. A failed blocker is called
out separately, because an 80% score with a failed blocker is still a broken
drawing.

---

## The target drawing

Every case is meant to carry one. `run.mts` names the cases that do not, and the
tool flags them, because a case without a target grades against nothing but
words.

```json
"ideal": {
  "file": "ideal.svg",
  "source": "hand-authored",
  "reviewed": true,
  "notes": "Why this drawing is the target."
}
```

`source` is `hand-authored`, `model-svg` (a model wrote the SVG) or `imagegen`.
How it was made does not matter much. **Whether someone looked at it does**, and
that is what `reviewed` records — an unreviewed target is shown with a warning
and its verdicts are provisional.

The review is not a formality. The first hand-authored target for
`circuit-load-bank` had labels colliding with their own symbols, and the second
drew the battery shorted straight onto the supply rail — a drawing that looked
tidy and was electrically wrong. Only the third pass was usable. A generated
target needs that pass more, not less.

### Drafting one with Codex

```bash
npm run eval:target -- --case circuit-555-astable
```

Codex drafts an SVG from the DSL source, the rubric and the engine's current
render; its image generator draws the same subject as a picture; then it looks
at both and says which is the better target.

The installed target is always the SVG, because a target has to be exact and
diffable and a generated raster cannot be. When the picture wins, Codex redraws
the SVG following the picture's composition and the picture is kept beside it as
`look.png`. Either way the result lands with `reviewed: false` and has to be
looked at before it grades anything.

The cheap way to author one by hand is to start from the engine's own render and
move things, rather than draw from nothing: the symbols are then real by
construction. `scripts/generate-engineering-review-targets.ts` shows the
stricter variant, which asserts every wire endpoint lands on a pin taken from
the live symbol geometry.

---

## Exemplars and variants

A **target** is what one case should look like. An **exemplar** is one drawing
per diagram variant, drawn to the published standard as the best that variant
can look. Every target in the variant copies its palette, type scale and idiom,
so a family's targets read as one drawing repeated, and the exemplar's own
source is rendered beside it so the gap to the engine stays visible.

Some types can be drawn in structurally different ways. A comparison is a
T-chart, a pros-and-cons list, a matrix, a scored decision matrix or a double
bubble, and each of those parses different data — there is no one comparison
source that all five could draw. Such a type lists its variants in
`visual-eval/variants.json`; each of its cases names one in `goal.json`
(`"variant": "decision"`), and `loadGoals` rejects a case that names none, or
names one on a type that has none. A variant counts separately everywhere: it
needs its own exemplar and its own cases.

A colour scheme is not a variant. `default`, `monochrome` and `dark` redraw the
same geometry, so drawing each would multiply the work without testing a single
new layout decision.

The coverage board (`#/`) gives each variant one next step, in the order the
work has to happen: duplicate cases (sources that agree once comments and
titles are removed), no cases, only one case, no exemplar, targets still to draw.

---

## The judge, and what it is not

`scripts/visual-eval/judge.mjs` runs Codex read-only in a scratch directory with the
rendered PNG attached, so it can only look at the image — it cannot read the
repository and infer the answer from the code. It returns one verdict and one
sentence of evidence per rule.

What it is good at: naming a specific visible defect ("the line from Cin crosses
the body of the second XOR gate"). What it is not good at: an overall quality
score. That is why the rubric is a list of yes/no questions and why the page
shows the evidence sentence next to every verdict — a verdict you cannot check
against what you can see in the image should not move a decision.

`unclear` is a real answer, not a failure. It usually means the render is too
dense at 1400px wide to judge, which is itself worth knowing.

**Prerequisite:** the judge needs a Codex CLI new enough for the account's
models. As of this writing the machine has `codex-cli 0.31.0`, and the server
rejects both configured models with "requires a newer version of Codex". Until
`npm i -g @openai/codex@latest` is run, `--judge` will fail and every rule reads
"not graded". The rest of the loop — rendering, snapshots, the page — works
without it.

The judge also clears MCP servers (`-c mcp_servers={}`) because it does not need
them, and `~/.codex/config.toml` currently has a malformed `mcp_servers.cloudflare`
entry that otherwise stops the CLI from starting at all.

---

## Versions

Every case can carry any number of snapshots. A snapshot is a frozen render plus
the commit that produced it, recorded by `record-snapshot.mts` — which refuses to
run on a dirty `src/`, so a snapshot always names a real commit.

The tool's two version pickers choose which pair to compare, so it answers both
"did my change help?" (release vs working tree) and "how far has this engine
come?" (an older release vs a newer one).

Each version carries a hash of the SVG it rendered. When the two chosen versions
hash the same they drew the same picture, and the tool collapses them into one
panel and one verdict column rather than showing the same image twice.

---

## What this system does not do

- It does not prove electrical, architectural or clinical correctness. It checks
  that the drawing is readable and follows drawing convention.
- It does not replace unit tests. Geometry facts that can be asserted — a wire
  that intersects a box, a label outside its room — belong in `tests/`, where
  they run in CI for free. The judge is for what geometry cannot express.
- It does not decide what ships. A score is an input to a review, not a merge
  gate.
