# Contributing a New Diagram Type

> A step-by-step guide for adding a new diagram plugin to Schematex — from standard spec to published website example. Read [`00-OVERVIEW.md`](./00-OVERVIEW.md) first for the overall architecture.

---

## 1. The Pipeline

Every diagram type follows the same pipeline:

```
Text (DSL) ──► Parser ──► AST ──► Layout ──► LayoutResult ──► Renderer ──► SVG
```

- **Parser** — hand-written recursive descent; no parser generators, no dependencies.
- **Layout** — pure functions over the AST that produce absolute geometry. Deterministic, no randomness.
- **Renderer** — string-building SVG via [`src/core/svg.ts`](../../src/core/svg.ts); no DOM, SSR-safe.

Small diagrams (e.g. timing) may fuse layout into the renderer. Complex diagrams (genogram, SLD) must keep them separate and tested independently.

---

## 2. Hard Constraints (non-negotiable)

1. **Zero runtime dependencies.** No D3, no dagre, no parser generators. Hand-write everything.
2. **Strict TypeScript.** No `any`, no un-commented `as`. Types in [`src/core/types.ts`](../../src/core/types.ts) are the spec.
3. **Semantic SVG.** Every rendered diagram must include `<title>`, `<desc>`, CSS classes for theming, and `data-*` attributes for interactivity. No inline styles.
4. **Use the SVG builder.** Never concatenate raw SVG strings — use [`src/core/svg.ts`](../../src/core/svg.ts).
5. **Test-first layout.** Write failing layout tests before writing the layout code.
6. **Standards-compliant.** Each diagram implements a published domain standard — not our invention. Cite the reference in the standard doc (IEEE, IEC, ISO, McGoldrick, etc.).

---

## 3. Step-by-Step Checklist

### Step 1 — Write the standard doc

Create `docs/reference/NN-{TYPE}-STANDARD.md` (next free number). It must contain:

- Scope & references (IEEE / IEC / published paper).
- Symbol table with ASCII/Unicode references.
- DSL grammar (EBNF or equivalent).
- Layout rules (axes, alignment, spacing).
- 3–5 canonical test cases with expected rendering notes.

Look at [`06-TIMING-STANDARD.md`](./06-TIMING-STANDARD.md) or [`11-SINGLE-LINE-STANDARD.md`](./11-SINGLE-LINE-STANDARD.md) as templates.

### Step 2 — Add AST types to `src/core/types.ts`

Types are the spec. Before writing any code, commit to:

- The `DiagramType` literal — extend the union in `types.ts`.
- The AST shape: nodes, edges, metadata, any diagram-specific fields.
- The LayoutResult shape (positions, sizes, computed routing).

Ship this as its own commit so reviewers can critique the contract separately.

### Step 3 — Scaffold the plugin directory

```
src/diagrams/{type}/
  index.ts       # DiagramPlugin export
  parser.ts      # text → AST
  layout.ts      # AST → LayoutResult   (optional; skip for simple diagrams)
  renderer.ts    # LayoutResult → SVG string
```

`index.ts` is always shaped like this:

```ts
import type { DiagramPlugin } from "../../core/types";
import { parseMyType } from "./parser";
import { renderMyType } from "./renderer";

export const myType: DiagramPlugin = {
  type: "mytype",
  detect(text) {
    const first = text.trim().split("\n")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("mytype");
  },
  render(text) {
    const ast = parseMyType(text);
    return renderMyType(ast);
  },
};
```

### Step 4 — Write tests first

```
tests/{type}/
  parser.test.ts
  layout.test.ts
  renderer.test.ts
  e2e.test.ts      # full text → SVG, snapshot string for stability
```

Cover every test case you committed to in the standard doc. Layout tests should assert absolute coordinates — that's what catches regressions.

### Step 5 — Implement parser → layout → renderer

Follow the tests. Keep each module pure — parser takes a string and returns an AST, layout takes an AST and returns geometry, renderer takes geometry and returns a string.

Use the SVG builder:

```ts
import { svg, g, rect, text } from "../../core/svg";
```

Never `'<svg>' + ... + '</svg>'`.

### Step 6 — Register the plugin

Edit [`src/core/api.ts`](../../src/core/api.ts):

1. Import `{ myType }` from `../diagrams/mytype`.
2. Add it to the `plugins[]` array.
3. Extend the `SchematexConfig.type` literal union.
4. Update the `detectPlugin` error message with the new keyword.

### Step 7 — Quality gate

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

All four must pass. If `dts` fails on unused locals, fix them — don't suppress.

### Step 8 — Wire into the website

1. **Gallery tile** — add an entry to [`website/lib/gallery-data.ts`](../../website/lib/gallery-data.ts). The `dsl` field must parse — validate with `node scripts/validate-gallery.mjs`.
2. **Static SVG** — add an entry to [`scripts/generate-gallery-svgs.mjs`](../../scripts/generate-gallery-svgs.mjs) and run it. The generated SVG ships with the repo and is referenced from the README.
3. **Docs page** — create `website/content/docs/{type}.mdx` with a `<Playground initial={…}>` and the body of the standard doc inlined.
4. **Example page (optional)** — for a real-world case study, add `website/content/examples/{slug}.mdx`.
5. **README** — add a row to the gallery table with the generated SVG.

### Step 9 — Update the top-level docs

- [`README.md`](../../README.md) — gallery row.
- [`CLAUDE.md`](../../CLAUDE.md) — "Completed" list at the bottom.
- [`docs/reference/00-OVERVIEW.md`](./00-OVERVIEW.md) — status table.

---

## 4. Common Pitfalls

- **Forgetting `detect()`** — if two plugins both return `true`, the first one wins. Make your header keyword unique.
- **Coordinate drift** — layout tests that use relative numbers (`width / 2 + padding`) mask bugs. Assert on concrete expected values.
- **Inline `style=` attributes** — blocked by the semantic-SVG rule. Use CSS classes and expose them as theme tokens in [`src/core/theme.ts`](../../src/core/theme.ts).
- **Runtime deps creeping in** — if you think you need one, open an issue first. The answer is almost always "hand-write a 30-line version."
- **Gallery DSL stubs that don't parse** — run `node scripts/validate-gallery.mjs` before committing. This script exists precisely because it kept happening.

---

## 5. Reference Plugins

Good examples to study, by complexity:

| Complexity | Plugin | Study for |
|-----------|--------|-----------|
| Minimal | [`timing`](../../src/diagrams/timing) | Parser + renderer only, no separate layout. |
| Medium | [`ecomap`](../../src/diagrams/ecomap) | Clean AST → layout → renderer split. |
| Advanced | [`genogram`](../../src/diagrams/genogram) | Generational layout, multi-pass routing, rich symbol set. |
| Advanced | [`sld`](../../src/diagrams/sld) | Voltage-level banding, bus routing, device clustering. |

---

## 6. Candidate Diagrams on the Roadmap

Not yet implemented — PRs welcome. Start with the standard doc (Step 1) and open a draft PR before coding.

- **Fishbone / Ishikawa** — cause-and-effect analysis. AST and standard doc are the main unknowns.
- **Sequence diagram** — UML sequence without depending on PlantUML/Mermaid conventions.
- **State machine** — UML state chart with hierarchical states.
- **Gantt** — project scheduling with dependencies and critical path.
- **Network topology** — L2/L3 network diagrams with device icons.

If you're adding one of these, the standard doc is doing most of the work — don't skimp on it.
