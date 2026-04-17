# CLAUDE.md — Lineage Development Instructions

> This file is the primary instruction set for Claude Code (CC) working on this project.
> Read this FULLY before writing any code. Every section matters.

## What is Lineage?

An open-source TypeScript library that converts a text DSL into SVG diagrams for:
1. **Genograms** — family structure + medical/psychological history (McGoldrick standard)
2. **Ecomaps** — individual/family ↔ environment relationship maps (radial layout)
3. **Pedigree charts** — genetic inheritance tracking (simplified genogram)

Think of it as "Mermaid for relationship diagrams." The key difference from Mermaid: we use **domain-specific layout algorithms** (generation-based for genograms, radial for ecomaps) instead of generic graph layout (dagre/ELK).

**Owner:** Victor (victor@mymap.ai) — solo founder running multiple AI SaaS products.
**Goal:** Open-source foundation that also powers genogram/ecomap/pedigree rendering in MyMap.ai and ChatDiagram.com.

---

## Architecture — The Pipeline

```
Text DSL → Parser → AST → Layout Engine → LayoutResult → SVG Renderer → SVG string
```

### Key files:
- `src/core/types.ts` — ALL shared types. This is the source of truth for data structures.
- `src/core/api.ts` — Public API surface (`render()`, `parse()`)
- `src/diagrams/genogram/` — Genogram plugin (parser + layout + renderer)
- `src/diagrams/ecomap/` — Ecomap plugin
- `src/diagrams/pedigree/` — Pedigree plugin
- `tests/` — Vitest tests

### Plugin interface:
Every diagram type implements `DiagramPlugin` (defined in `src/core/types.ts`):
```ts
interface DiagramPlugin {
  type: DiagramType;
  detect: (text: string) => boolean;     // Can this plugin handle this text?
  parse: (text: string) => DiagramAST;   // Text → AST
  layout: (ast: DiagramAST, config: LayoutConfig) => LayoutResult;  // AST → positioned nodes/edges
  render: (layout: LayoutResult, config: RenderConfig) => string;   // LayoutResult → SVG string
}
```

---

## Development Rules (HARD RULES — do not deviate)

### 1. Zero runtime dependencies
This library ships with **zero npm dependencies**. No D3, no dagre, no external layout library.
- Layout algorithms: implement from scratch in TypeScript
- SVG generation: string concatenation or a tiny internal SVG builder utility
- Parser: hand-written recursive descent parser (no PEG.js, no chevrotain, no external parser generator)
- Rationale: keeps bundle tiny, avoids supply chain risk, forces us to deeply understand the algorithms

### 2. Output must be valid, semantic SVG
Every SVG output must:
- Be valid SVG 1.1 that renders in all modern browsers
- Include `<title>` and `<desc>` for accessibility
- Use CSS class names: `.lineage-node`, `.lineage-edge`, `.lineage-label`, `.lineage-generation-N`
- Use data attributes: `data-individual-id`, `data-relationship-type`, `data-generation`
- Have NO inline styles (use CSS classes only) — consumers should be able to theme via CSS
- Be self-contained (no external references, fonts, or images)

### 3. Type safety is non-negotiable
- Strict TypeScript (`strict: true` in tsconfig)
- No `any` types. No `as` casts unless absolutely necessary with a comment explaining why.
- All public API functions must have JSDoc comments with `@example`
- All types must be exported from the package

### 4. Test-first for layout algorithms
Layout is the hardest and most important part. For layout code:
- Write the test FIRST with expected node positions
- Use snapshot tests for SVG output (but also have assertion-based tests for positions)
- Test edge cases: single person, childless couple, multiple marriages, 5+ generations, blended families
- Every genogram layout test should verify: same-generation nodes have same Y, male is left of female in couple, children are ordered by birth year

### 5. Genogram standard compliance
Follow the McGoldrick et al. genogram symbol standard:
- **Male:** square (□), **Female:** circle (○), **Unknown/Other:** diamond (◇)
- **Deceased:** X drawn through the shape
- **Stillborn:** smaller shape, **Miscarriage:** small triangle, **Abortion:** small ×
- **Marriage:** horizontal solid line connecting partners
- **Divorce:** two slashes (//) on the marriage line
- **Separation:** single slash (/) on the marriage line
- **Cohabitation:** dashed horizontal line
- **Parent-child:** vertical line from couple's horizontal line down to child
- **Adoption:** dashed vertical line to child
- **Foster:** dotted vertical line to child
- **Identical twins:** V-shape from single point, **Fraternal twins:** inverted V
- **Conditions:** fill patterns inside shape (full, half-left, half-right, quarter)
- Male is ALWAYS left, female ALWAYS right in a couple
- Children ordered left-to-right by birth year (oldest → youngest)
- Same generation = same vertical position (Y coordinate)

### 6. Ecomap standard
- Subject (individual or family unit) at center
- External systems arranged radially around center
- Line styles: solid thick (strong), dashed (weak), wavy (stressful)
- Arrows indicate direction of energy/resource flow
- Connection weight (1-5) maps to line thickness

### 7. Pedigree chart standard
- Similar to genogram but focused on genetic traits
- Carrier status: half-filled shape
- Affected: fully filled shape
- Proband: arrow pointing to the individual
- Consanguinity: double horizontal line between related parents
- Generation labeling: Roman numerals (I, II, III...)
- Individual labeling within generation: Arabic numerals (1, 2, 3...)

---

## Implementation Phases

### Phase 1: Genogram (CURRENT PRIORITY)
Build in this exact order:

1. **Parser** (`src/diagrams/genogram/parser.ts`)
   - Hand-written recursive descent
   - Grammar should be forgiving (whitespace-insensitive, optional commas)
   - Error messages must be human-readable with line/column numbers
   - Output: `DiagramAST` (defined in `src/core/types.ts`)

2. **Symbols** (`src/diagrams/genogram/symbols.ts`)
   - SVG path definitions for each symbol (male, female, unknown, deceased variants)
   - Each symbol is a function: `(x, y, size, conditions?) → SVG group string`
   - Conditions use fill patterns (define `<pattern>` elements in SVG `<defs>`)

3. **Layout** (`src/diagrams/genogram/layout.ts`)
   - **THE HARDEST PART. Take your time. Get it right.**
   - Algorithm outline:
     a. Build a family graph from the AST
     b. Assign generation indices (BFS from root couple, or from oldest known generation)
     c. Create "family units" (couple + children groups)
     d. Within each generation, order family units to minimize edge crossings
     e. Assign X positions: center children under parents, space evenly
     f. Assign Y positions: fixed spacing per generation
     g. Handle special cases: multiple marriages (show sequentially), remarriage after divorce, childless couples, individuals with no partner
   - Output: `LayoutResult` with positioned nodes and edge paths

4. **Renderer** (`src/diagrams/genogram/renderer.ts`)
   - Takes `LayoutResult` → SVG string
   - Draws: symbols at node positions, relationship lines as paths, labels
   - Adds `<defs>` section with fill patterns and arrow markers
   - Wraps in SVG with viewBox calculated from layout bounds + padding

5. **Integration** — wire up in `src/diagrams/genogram/index.ts` and `src/core/api.ts`

### Phase 2: Ecomap + Pedigree
- Ecomap: new radial layout algorithm, reuse renderer patterns
- Pedigree: fork genogram parser/layout, strip relationship-quality indicators, add carrier/proband semantics

### Phase 3: Integrations
- `renderToElement()` for browser DOM
- React component wrapper
- Markdown-it / remark plugin
- Obsidian plugin

---

## DSL Grammar (Genogram)

This is the target grammar. Implement it exactly.

```
document     = header? generation*
header       = "genogram" (QUOTED_STRING)?  NEWLINE
generation   = individual* relationship*
individual   = ID properties? NEWLINE
properties   = "[" property ("," property)* "]"
property     = SEX | "deceased" | "stillborn" | "miscarriage" | "abortion"
             | "conditions:" condition_list
             | YEAR_NUMBER
             | KEY ":" VALUE
SEX          = "male" | "female" | "unknown"
condition_list = condition ("+" condition)*
condition    = IDENTIFIER "(" FILL_PATTERN ")"
FILL_PATTERN = "full" | "half-left" | "half-right" | "quarter" | "striped"
relationship = couple_rel | parent_child_rel
couple_rel   = ID COUPLE_OP ID NEWLINE
COUPLE_OP    = "--" | "-x-" | "-/-" | "~" | "=="
parent_child_rel = ID COUPLE_OP ID NEWLINE INDENT child+ DEDENT
child        = individual
ID           = [a-zA-Z][a-zA-Z0-9_-]*
QUOTED_STRING = '"' [^"]* '"'
YEAR_NUMBER  = [0-9]{4}
```

Notes:
- Indentation-based child grouping (like Python/YAML)
- `#` starts a line comment
- Properties in `[...]` are comma-separated, order doesn't matter
- IDs are case-insensitive for matching, preserved for display
- An individual can appear multiple times (first defines, subsequent reference)

---

## Code Quality Gates

Before any PR or commit:
1. `npm run typecheck` — zero errors
2. `npm run test` — all pass
3. `npm run lint` — zero warnings
4. `npm run build` — produces valid dist/
5. Manual visual check: render at least 3 test cases and visually verify the SVG

---

## File Naming Conventions

- Source: `src/diagrams/{type}/{module}.ts` (e.g., `src/diagrams/genogram/parser.ts`)
- Tests: `tests/{type}/{module}.test.ts` (e.g., `tests/genogram/parser.test.ts`)
- Test fixtures: `tests/fixtures/{type}/` (e.g., `tests/fixtures/genogram/simple-family.txt`)
- Example outputs: `examples/{type}/` (e.g., `examples/genogram/three-generation.svg`)

---

## Common Pitfalls (learn from our other projects)

1. **Don't over-engineer the parser.** A recursive descent parser for this grammar is ~200 lines. Don't bring in parser generators — they add complexity for a simple grammar.

2. **Layout edge cases will eat you alive.** The "happy path" (nuclear family, 3 generations) is easy. The hard cases: person married 3 times with children from each; person who is both a parent and a step-parent in the same diagram; 6+ generations causing horizontal explosion. Test these EARLY.

3. **SVG coordinate math.** Remember: SVG Y-axis goes DOWN. Generation 0 (oldest) is at the TOP. Double-check all Y calculations.

4. **String-based SVG generation is fragile.** Build a small SVG builder utility (`src/core/svg.ts`) that handles escaping, attribute formatting, and nesting. Don't concatenate raw strings.

5. **Test with real-world genograms.** The McGoldrick textbook has standard examples. Use them as test fixtures. A library that can't render the textbook examples is not ready for release.

---

## Reference Materials

- McGoldrick, M., Gerson, R., & Petry, S. (2020). *Genograms: Assessment and Treatment.* — THE standard reference
- GenoPro genogram rules: https://genopro.com/genogram/rules/
- Standard genogram symbols: https://en.wikipedia.org/wiki/Genogram
- Ecomap theory: https://en.wikipedia.org/wiki/Ecomap
- Pedigree chart standards (genetics): https://en.wikipedia.org/wiki/Pedigree_chart

---

## When in doubt

1. Check `src/core/types.ts` — the types are the spec
2. Check this file — the rules are non-negotiable
3. If neither answers your question, ask Victor before guessing
