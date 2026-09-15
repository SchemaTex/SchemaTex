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
open http://127.0.0.1:3031/eval/

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
| `visual-eval/symbols/<type>/` | A type's symbols drawn in its exemplar's style: one SVG per symbol and a `manifest.json` |
| `visual-eval/demand.json` | ChatDiagram usage and payment counts per type, the willingness-to-pay judgement behind each grade, and each type's search-volume benchmark keyword |
| `scripts/visual-eval/lib.mts` | Case loading, rendering, rasterising |
| `scripts/visual-eval/run.mts` | The orchestrator; writes `report.json` |
| `scripts/visual-eval/exemplars.mts` | Renders each exemplar's source beside its drawing; writes `exemplars.json` |
| `scripts/visual-eval/symbols.mts` | Collects the symbol sets and the engine's catalog drawing of each symbol; writes `symbols.json` |
| `scripts/visual-eval/judge.mjs` | The vision judge |
| `scripts/visual-eval/propose-target.mjs` | Drafts a target drawing with Codex |
| `eval/` | The review tool — a small React app served by the preview server |
| `scripts/visual-eval/verify.mjs` | Browser check for the tool |
| `preview/visual-eval/report.json` | **The contract.** Everything else is a view of this |

`report.json` is the interface between the machinery and the viewer. The tool
fetches it and `exemplars.json` at runtime, and bundles `variants.json` and the
diagram registry (for each type's cluster); a CI comment or a diff bot would
read the same files.

The tool is React because the corpus is meant to reach every diagram type, and
at that size the review surface needs routes — `#/` (the coverage board),
`#/exemplars`, `#/symbols/<type>`, `#/<type>`, `#/<type>/<variant>` and `#/<type>[/<variant>]/<case>` —
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

A different symbol standard is a variant. ANSI and IEC logic gates, ANSI and
IEC one-line symbols, AWS and ISO system A weld callouts, and ISO, NFPA and UAE
evacuation symbols are each checked against different published shapes.

Moving the same elements around is not a variant. Direction (left to right or
top to bottom) and placement algorithms (ring, layered, force-directed, network
topologies) keep one kit of shapes, so network, markov and sociogram each stay
a single variant with cases that exercise the layouts. Git graphs are the
exception: a horizontal history puts each commit's message along its lane, a
vertical one gives every commit its own row with the message beside it, and
both are established conventions, so `horizontal` and `vertical` are variants.

Phylo explicitly compares two branch drawing variants: `slanted` (default) and
`rectangular`. They share tree semantics but differ in how branches meet. The
registry may mark one variant `"default": true`: its type page opens that variant,
while `#/<type>/all` shows all cases. This does not change a case’s authored DSL.

A mode the parser accepts but the engine does not yet draw differently is not a
variant until it is drawn: ERD Chen and Barker notation, PRISMA 2009, IEC
fault-tree gates, compact bowtie, FMEA worksheet types, and phylo circular and
unrooted layouts.

The coverage board (`#/`) gives each variant one next step, in the order the
work has to happen: duplicate cases (sources that agree once comments and
titles are removed), no cases, only one case, no exemplar, targets still to draw.


## Symbols

A symbol-heavy type (floor plans, one-lines, schematics, P&IDs, evacuation plans,
breadboards) is only as consistent as its symbols. Each type's symbol library is
drawn from its exemplar: the same stroke weights, palette, fills and proportions,
at the scale the symbol has in that exemplar. The exemplar decides the look; the
symbols make that look reusable, and every later target and engine symbol is
checked against them.

A set lives in `visual-eval/symbols/<type>/`: one SVG per symbol and a
`manifest.json` naming the exemplar it copies, one `style` sentence a reviewer can
check by eye, and per symbol its label, DSL names, the standard it follows, and the
id of the engine's catalog entry for the same symbol (`getSymbolCatalog`), if any.
`scripts/visual-eval/symbols.mts` collects the sets and the engine's drawings into
`preview/visual-eval/symbols.json`.

The Symbols page (`#/symbols/<type>`) shows the exemplar the set copies, a sheet of
every symbol at its true relative size (uneven line weights and proportions show up
there, not one symbol at a time), and each symbol beside the engine's version at
diagram size, 2× or 4×, with its standard. Accept / needs-change marks are kept in
the reviewer's browser and copied out as a text summary.

## Demand grades

The coverage board rates each type three ways, as a level from nothing through 🚗, ✈️ and 🚀, so the order of work can follow
value rather than habit. The grades often disagree, and that is the point:
flowchart is the most used type and one of the least worth paying for, while
pedigree is rarely requested and read by clinical geneticists.

**Usage** is the number of people who got a successful diagram of the type on
ChatDiagram in the snapshot window: 🚀 for 1,000 or more, ✈️ for 300
or more, 🚗 for 100 or more, and nothing below 100.

**Willingness to pay** starts from a judgement, because ChatDiagram's paying
users are too few (about 230 in 90 days) to rank 50 types on their own. Each
type is scored 0 to 2 on four questions:

- Is the drawing a professional obligation, or mostly for students and casual use?
- Is there no good free substitute? Flowcharts, mind maps and timelines have many.
- Does a wrong drawing cost something real, such as a failed inspection or a misread family history?
- Is there a published standard the drawing can be checked against?

A total of 7–8 earns 🚀, 5–6 ✈️, 3–4 🚗, and 0–2 nothing. Payment
data then moves the level by one step, and only when at least 150 users
generated the type. The data
combines two measures, each compared with the site-wide rate: the share of the
type's users who were on a paid plan when they generated it, and the share of
new users who started a subscription within 30 days of first using it. Both are
pulled toward the site-wide rate in proportion to how few users a type has, so
a type with three users cannot look exceptional. At 1.3 times average or more
the type moves up a level; at 0.75 or less it moves down one.

**Search volume** is how many people in the US search each month for a tool
that makes the type, from Google Keyword Planner (English). The benchmark is
the type's most-searched tool keyword: the biggest of "maker", "creator",
"generator", "software", "tool", "builder", "online", "app" and "designer" after
each name people use for the drawing or one of its variants. 🚀 for
5,000 or more, ✈️ for 1,000 or more, 🚗 for 200 or more, and nothing below 200.

The bare name is not the benchmark, because most people searching "venn diagram"
want a definition or an example, not a tool. Templates, simulators and
calculators are left out too, since each is a different job, and so is a variant name that is a
software category of its own: people searching "gantt chart software" want a project-management
suite, so pert is benchmarked on "critical path software". Keyword Planner
reports near-identical words as one number, so "maker", "creator" and
"generator" often read the same. A keyword that mostly means something else is
skipped and named in the cell's hover text: "circuit maker" is mostly Altium's
CircuitMaker product, and "pedigree online" is dog and horse pedigrees.

`demand.json` holds the raw counts and the four scores with a one-line reason;
the board computes the levels. To refresh it, rerun the queries against the
ChatDiagram database (tables `artifacts`, `ai_usage` with `metadata->>'plan'`,
and `subscriptions`), excluding the owner's account, and update the counts and
the `window` label. Refresh search volume by looking up the same keywords in
Keyword Planner and updating `search` on each type and its `pulled` date. Types ChatDiagram routes elsewhere (charts, economics
curves, chemistry) are not in the file.

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
