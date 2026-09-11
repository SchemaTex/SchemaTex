Title and fishbone audit (2026-09-09)

Audited all 50 engine directories under `src/diagrams/`, including the influence, Gantt, matrix, floorplan and playbook renderer variants. “Visible” below means SVG `<text>`, not accessibility `<title>` metadata. The mindmap DSL uses a drawn root topic rather than a separate diagram title.

The existing shared mechanisms are [`TITLE`](../../src/core/theme.ts) (16px, weight 700, centered, baseline 24, band 40) and [`resolveSceneTitle`](../../src/core/title-scene.ts) (title position, pins and scene registration). They are separate: many existing renderers use the scene resolver with local styling/placement. Existing visible local title styles were left alone except in the three reported families.

| Engine | DSL accepts title | Visible before this change | Shared mechanism before | Changed here |
| --- | --- | --- | --- | --- |
| `blockdiagram` | Yes | Yes | TITLE token | comment-aware detection |
| `bowtie` | Yes | Yes | Local only | comment-aware detection |
| `bpmn` | Yes | No (metadata only) | None | shared visible title + band |
| `breadboard` | Yes | Yes | scene resolver | Unchanged |
| `causalloop` | Yes | Yes | Local only | comment-aware detection |
| `circuit` | Yes | Yes | scene resolver | comment-aware detection |
| `comparison` | Yes | Yes | TITLE token | comment-aware detection |
| `decisiontree` | Yes | Yes | scene resolver (tree); local (influence) | comment-aware detection |
| `ecomap` | Yes | No | None | shared visible title + band |
| `entity` | Yes | Yes | Local only | comment-aware detection |
| `epc` | Yes | Yes locally; lost after leading comment through API | Local only | comment-aware detection; shared title tokens + scene resolver |
| `erd` | Yes | Yes | scene resolver | Unchanged |
| `eventtree` | Yes | Yes | Local only | comment-aware detection |
| `faulttree` | Yes | Yes | Local only | comment-aware detection |
| `fbd` | Yes | Yes | scene resolver | comment-aware detection |
| `fishbone` | Yes | Yes | scene resolver | remove CSS stroke override |
| `floorplan` | Yes | Yes | scene resolver, TITLE token | Unchanged |
| `flowchart` | Yes | Yes | scene resolver | Unchanged |
| `fmea` | Yes | Yes | Local only | comment-aware detection |
| `genogram` | Yes | Yes | scene resolver | Unchanged |
| `gitgraph` | Yes | No (metadata only) | None | shared visible title + band; retain frontmatter title in header |
| `idef0` | Yes | Yes locally; lost after leading comment through API | Local only | comment-aware detection; shared title tokens + scene resolver; populate form number; restore form title via detection |
| `ladder` | Yes | Yes | Local only | Unchanged |
| `logic` | Yes | Yes | Local only | comment-aware detection |
| `markov` | Yes | Yes locally; lost after leading comment through API | Local only | comment-aware detection; shared title tokens + scene resolver |
| `matrix` | Yes | Yes | Local only | comment-aware detection |
| `mindmap` | Root topic only; no separate diagram title | Root topic is drawn | N/A | Unchanged |
| `network` | Yes | Yes | scene resolver | Unchanged |
| `orgchart` | Yes | Yes | scene resolver | comment-aware detection |
| `pedigree` | Yes | No (metadata only) | None | shared visible title + band |
| `pert` | Yes | Yes | Local only | Unchanged |
| `petri` | Yes | Yes | scene resolver | Unchanged |
| `phylo` | Yes | Yes | Local only | Unchanged |
| `pid` | Yes | Yes | scene resolver | comment-aware detection |
| `playbook` | Yes | Yes | TITLE token | Unchanged |
| `prisma` | Yes | Yes | Local only | Unchanged |
| `rbd` | Yes | Yes | Local only | Unchanged |
| `sequence` | Yes | Yes | scene resolver | Unchanged |
| `sfc` | Yes | Yes | Local only | comment-aware detection |
| `siteplan` | Yes | Yes | scene resolver, TITLE token | Unchanged |
| `sld` | Yes | Yes | Local only | Unchanged |
| `sociogram` | Yes | Yes | Local only | Unchanged |
| `state` | Yes | Yes | scene resolver | comment-aware detection |
| `threatmodel` | Yes | Yes | Local only | comment-aware detection |
| `timeline` | Yes | Yes | scene resolver | comment-aware detection |
| `timing` | Yes | Yes | scene resolver | comment-aware detection |
| `umlclass` | Yes | Yes | scene resolver | Unchanged |
| `usecase` | Yes | Yes | Local only | Unchanged |
| `venn` | Yes | Yes | Local only | comment-aware detection |
| `welding` | Yes | Yes | Local only | comment-aware detection |

The reported EPC/IDEF0/Markov inputs begin with a native `#` comment. Their raw-input detectors returned false, so forced-type API preparation prepended an untitled header. The parsers consumed that header and lost the authored title on the following header. Their existing text-emission code therefore never ran. Detection now uses the established `firstContentLine`; the same adoption covers the other affected detectors. No parser comment grammars were broadened.

BPMN, ecomap, pedigree and gitgraph had no diagram-title text emission. They now reserve the shared band and emit a shared-positioned title. Gitgraph's native configuration title was also stripped by public frontmatter processing and synthesized into a header the parser ignored; it now reads that header title while retaining an authored orientation. IDEF0's title cell receives the restored title, and its previously empty NUMBER cell receives the parsed node number (also shown in NODE).

Fishbone's layout and emitted `<line>` already described one horizontal spine, an arrow marker, and independently attached category bones. The CSS `stroke: var(--schematex-fb-spine, #141413)` overrode each spine/tail element's explicit stroke. Normalizing the saved SVG through the evaluator's existing Resvg parser **without rasterizing** produced `stroke="none" visibility="hidden"` for the spine. Removing those two CSS declarations produced `stroke="#141413" stroke-width="2"` for the same path. This was a paint-resolution gap, not a missing layout element. The category coordinates needed no additional changes.

Regression coverage now checks public API SVG text across the catalog, native comment/title preservation, the shared title placement, IDEF0 form cells, and fishbone's emitted spine/arrow/category endpoints. Fishbone additionally checks the evaluator's normalized SVG string for a painted spine; it never calls rasterization.

Branch deltas are relative to the working tree at the start of this task, preserving all pre-existing edits. Counted with the TypeScript syntax tree: each `if`, ternary, non-default `case`, loop, `catch`, `&&`, `||`, and `??` counts once. Optional chaining, functions and `else` do not count. The `+1` detector changes below are the undefined-to-empty-string `??` required by the existing shared reader; first-line detectors that already had that default remain at zero.

| Changed file | Net branch count |
| --- | ---: |
| `src/diagrams/blockdiagram/index.ts` | +0 |
| `src/diagrams/bowtie/index.ts` | +1 |
| `src/diagrams/bpmn/renderer.ts` | +3 |
| `src/diagrams/causalloop/index.ts` | +1 |
| `src/diagrams/circuit/index.ts` | +0 |
| `src/diagrams/comparison/index.ts` | +1 |
| `src/diagrams/decisiontree/index.ts` | +1 |
| `src/diagrams/ecomap/renderer.ts` | +2 |
| `src/diagrams/entity/index.ts` | +0 |
| `src/diagrams/epc/index.ts` | +1 |
| `src/diagrams/epc/layout.ts` | +0 |
| `src/diagrams/epc/renderer.ts` | +0 |
| `src/diagrams/eventtree/index.ts` | +1 |
| `src/diagrams/faulttree/index.ts` | +1 |
| `src/diagrams/fbd/index.ts` | +0 |
| `src/diagrams/fishbone/renderer.ts` | +0 |
| `src/diagrams/fmea/index.ts` | +1 |
| `src/diagrams/gitgraph/parser.ts` | +1 |
| `src/diagrams/gitgraph/renderer.ts` | +2 |
| `src/diagrams/idef0/index.ts` | +1 |
| `src/diagrams/idef0/layout.ts` | +0 |
| `src/diagrams/idef0/renderer.ts` | -1 |
| `src/diagrams/logic/index.ts` | +0 |
| `src/diagrams/markov/index.ts` | +1 |
| `src/diagrams/markov/layout.ts` | +0 |
| `src/diagrams/markov/renderer.ts` | +0 |
| `src/diagrams/matrix/index.ts` | +0 |
| `src/diagrams/orgchart/index.ts` | +1 |
| `src/diagrams/pedigree/renderer.ts` | +1 |
| `src/diagrams/pid/index.ts` | +1 |
| `src/diagrams/sfc/index.ts` | +0 |
| `src/diagrams/state/index.ts` | +1 |
| `src/diagrams/threatmodel/index.ts` | +1 |
| `src/diagrams/timeline/index.ts` | +1 |
| `src/diagrams/timing/index.ts` | +0 |
| `src/diagrams/venn/index.ts` | +0 |
| `src/diagrams/welding/index.ts` | +1 |
| `tests/core/diagram-titles.test.ts` | +13 |
| `tests/fishbone/renderer.test.ts` | +1 |
| `docs/system/TITLE-AND-FISHBONE-AUDIT.md` | 0 |

Verification passed: `npx vitest run tests/fishbone tests/epc tests/idef0 tests/markov tests/core` (33 files, 751 tests) and `npx tsc --noEmit` (exit 0). No full test suite, rasterization, image inspection, runtime dependency, case-specific runtime path or compatibility layer was added. Existing nonshared titles that already draw, parser comment grammars, unrelated workspace edits, and visual verification were deliberately left alone.
