# Legend System

*Unified, opt-out legend rendering across all Schematex diagrams.*

A legend is a small key drawn next to a diagram that explains what a color, line style, or symbol *means*. Without it, a green line on a sociogram is just decoration — with it, the line says "positive choice (Moreno 1934)". This doc defines the cross-diagram model.

---

## Status

| Phase | Diagrams | State |
|---|---|---|
| Foundation | shared types, renderer, DSL directives, theme tokens | implemented |
| Tier-A migration | genogram | implemented |
| Tier-A migration | ecomap, sociogram, entity, fishbone, phylo | planned |
| Pedigree migration | pedigree (move from `LegendEntry` to `LegendSpec`) | planned |
| Tier-B migration | timeline, matrix (already render legends — unify under shared core); flowchart, decisiontree, orgchart | planned |
| Tier-C compliance | timing, logic, circuit, ladder, sld, venn, mindmap | no legend by design |

---

## Why it matters

Schematex's positioning is *"diagrams professionals actually use"*. Every published genogram, ecomap, ER fishbone, or org chart in the field includes a legend — without it the diagram is incomplete. Three of our 20 diagram types (`pedigree`, `timeline`, `matrix`) already render legends, each with its own bespoke layout, classes, and behavior. The legend system unifies them and brings the missing 80% along.

---

## Default-on policy

Legend is on by default for diagrams whose visual encoding cannot be read at a glance. Diagrams whose symbols are universally standardized (IEEE 91, IEC 61131-3, IEEE 315, WaveDrom) intentionally omit a legend — adding one would clutter a compliance-driven canvas.

| Tier | Diagrams | Default | Reason |
|---|---|---|---|
| **A** Encoding-dense relational | genogram, ecomap, sociogram, entity, fishbone, phylo, pedigree | **on** | Colors and line styles encode multiple orthogonal axes (valence × strength × directionality, etc.). Unreadable without a key. |
| **B** Category-driven | timeline, matrix, flowchart (with classDef), decisiontree, orgchart | **on** | Per-category colors carry meaning that text labels alone don't expose. |
| **C-conditional** | blockdiagram | **on** if `role` set on ≥2 blocks; otherwise off | Block roles drive fill colors; transfer-function labels usually self-describe. |
| **C** Compliance / self-labeled | timing, logic, circuit, ladder, sld, venn, mindmap | **off** | Symbols are field-standard or labels live on the shape itself. |

Override per-diagram via the DSL:

```
legend: off                         # override default
legend: on outside-right            # also accepts position keyword
```

---

## The model

Three TypeScript structures live in [`src/core/types.ts`](../../src/core/types.ts):

```ts
LegendSpec            // the resolved, render-ready shape
LegendItem            // one row in the legend
LegendOverrides       // user edits parsed from DSL, merged onto auto-derived spec
```

Pipeline:

```
AST  ──► buildXxxLegend(ast)  ──► auto LegendSpec
                                       │
                ast.legendOverrides  ──┴──► applyLegendOverrides()  ──► final LegendSpec
                                                                              │
                                                                       renderLegend()  ──► <g> + bbox
```

### `LegendItem`

```ts
type LegendItemKind =
  | "shape"         // mini node shape (square / circle / diamond)
  | "fill"          // colored swatch
  | "fill-pattern"  // half-left / quad-tl / striped / dotted
  | "line"          // line preview with color + dasharray + width
  | "marker"        // small symbol (X, dot, arrow, P, C, star)
  | "edge";         // composite line + endpoint marker

interface LegendItem {
  key: string;            // stable identifier for DSL overrides ("close", "cancer", "married")
  label: string;          // display text — user-overridable
  kind: LegendItemKind;
  color?: string;
  color2?: string;        // two-tone swatches
  pattern?: "solid" | "dashed" | "dotted" | "double" | "wavy" | "zigzag" | "broken";
  strokeWidth?: number;
  shape?: string;         // "square" | "circle" | "diamond" | "concentric-square" | …
  marker?: string;        // "arrow" | "X" | "dot" | "P" | "C" | "star"
  section?: string;       // group id ("symbols" | "structural" | "relationships" | …)
}
```

### `LegendSpec`

```ts
type LegendPosition =
  | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  | "outside-right" | "outside-bottom"
  | "none";

interface LegendSection { id: string; title: string; hidden?: boolean; }

interface LegendSpec {
  mode: "on" | "off" | "auto";
  title: string;          // box header (default: "Legend")
  position: LegendPosition;
  columns: number;        // default 1
  sections: LegendSection[];
  items: LegendItem[];
}
```

### `LegendOverrides`

```ts
interface LegendOverrides {
  mode?: "on" | "off" | "auto";
  title?: string;
  position?: LegendPosition;
  columns?: number;
  labels?: Record<string, string>;             // rename by key
  hide?: string[];                             // hide by key
  sections?: Record<string, { title?: string; hidden?: boolean }>;
  added?: LegendItem[];                        // user-authored extras
}
```

---

## DSL directives

Every diagram parser consumes the same set of `legend.*` directives via the shared helper [`src/core/legend-parser.ts`](../../src/core/legend-parser.ts). The directives can appear anywhere in the DSL after the header.

```dsl
# Master toggle / position shorthand
legend: on
legend: off
legend: outside-right                # mode=on + position
legend: bottom-right

# Box-level config
legend.title: "Family Symbols"
legend.position: outside-right
legend.columns: 2

# Rename auto-derived items by their semantic key
legend.label close: "Best friends forever"
legend.label hostile: "Major conflict"
legend.label cancer: "Stage IV breast cancer"

# Hide auto-derived items
legend.hide: distant, normal, cohabiting

# Rename / hide whole sections
legend.section relationships: "Connection Styles"
legend.section heritage.hide: true

# Add manually authored items
legend.item dv: "Domestic violence" (kind: line, color: #b71c1c, pattern: zigzag)
legend.item flag-legal: "Legal flag" (kind: marker, color: #b91c1c)
```

### How to find the right key

Each diagram's auto-derivation uses predictable keys. The renderer also stamps `data-legend-key="<key>"` on every `<g>` row, so you can inspect a rendered SVG to pick a key. See per-diagram standard docs for the canonical list (e.g. [`01-GENOGRAM-STANDARD.md`](./01-GENOGRAM-STANDARD.md) → Legend section).

Conventions:

| Source | Key format |
|---|---|
| Relationship type | the literal type (`close`, `married`, `divorced`) |
| Sex / status shape | `sex.male`, `status.deceased`, `status.stillborn` |
| Condition by category | `condition.<category>` (`condition.cancer`) |
| User-named condition label | the literal label (`BRCA1`) |
| Heritage / culture | the literal heritage id |
| Markers | `marker.<id>` (`marker.proband`, `marker.index-person`) |
| Edge ops (entity) | the op (`ownership`, `voting`, `pool`, `license`, `distribution`) |
| Categories (timeline / matrix / orgchart dept) | the category string |

---

## Auto-derivation: what each diagram emits

The auto-derive function for each diagram walks the AST and emits items **only for encodings that actually appear**. A genogram with one couple does not list the 25 emotional relationship types it doesn't use. Each per-diagram standard doc enumerates its sections and keys; here is the high-level summary:

| Diagram | Sections (in order) | Notes |
|---|---|---|
| genogram | Symbols → Structural → Relationships → Conditions → Heritage → Markers | Largest legend in the library; ~25 possible relationship types alone. |
| ecomap | Categories → Strength → Energy flow | Strength = parallel/single/dashed/dotted/wavy line preview. |
| sociogram | Valence → Strength → Roles → Groups | Valence = green/red/grey lines. |
| entity | Entity types → Edge ops → Status → Clusters | Edge ops have 5 nearly-identical dashed styles. |
| fishbone | Major bones | One row per major-bone color → category. |
| phylo | Clades → Support thresholds | Clades only if `clade` blocks are defined; thresholds: ≥95 / ≥75 / ≥50 / <50. |
| pedigree | Trait fills → Genetic status → Markers | Migrates the existing `legend:` DSL into this system. |
| flowchart | Class definitions → Edge kinds | Only if user defined `classDef` and/or used multiple edge kinds. |
| decisiontree | Node shapes | Only shapes actually used (decision/chance/outcome/taxon/leaf). |
| orgchart | Departments → Card status → Reporting line | Departments only if `department` set; card-status only if vacant/draft/external present. |
| timeline | Categories | Replaces the existing hardcoded "Teams" header. |
| matrix | Categories or color ramp + correlation key | Already implemented; will move to shared renderer in a follow-up. |
| blockdiagram | Roles | Conditional — only if ≥2 blocks have `role`. |

---

## Theming

Legend visual tokens are derived from the existing `BaseTheme` in [`src/core/theme.ts`](../../src/core/theme.ts) — no new theme tokens are introduced:

| Element | Token |
|---|---|
| Box background | `t.bg` |
| Box stroke | `t.neutral` |
| Box title | `t.text` |
| Section title | `t.textMuted` |
| Item label | `t.text` |
| Swatch border | `t.stroke` |

CSS class prefix: `schematex-legend-*`. Consumers can override via the `--schematex-*` custom properties already exposed by every diagram.

---

## Position semantics

| Position | Behavior |
|---|---|
| `top-left`, `top-right`, `bottom-left`, `bottom-right` | Overlay inside the existing canvas; risks overlapping content on dense diagrams. |
| `outside-right`, `outside-bottom` | Renderer reserves canvas margin and grows `width` / `height` so the legend never overlaps content. **Default for Tier-A diagrams.** |
| `none` | Equivalent to `legend: off`. |

If `legendOverrides.position` is unset, each diagram picks the safest default — usually `outside-right`.

---

## Examples

### Genogram with auto legend (default)

```dsl
genogram "Smith Family"
  john [male, 1950, status: deceased]
  mary [female, 1955, conditions: "diabetes (cardiovascular)"]
  john -- mary
    alice [female, 1980]
    bob [male, 1983]
  alice -close- bob
  john -conflict- bob
```

Renders the diagram plus a legend on the right with sections: **Symbols** (☐ male, ◯ female, ☐⨯ deceased), **Structural** (━━ married), **Relationships** (green solid = close, red zigzag = conflict), **Conditions** (red square = diabetes).

### Genogram with custom labels and a hidden item

```dsl
genogram "Smith Family"
  legend.title: "Family Relationships"
  legend.label close: "Best friends forever"
  legend.label conflict: "Long-running feud"
  legend.hide: cohabiting

  john [male, 1950]
  mary [female, 1955]
  ...
```

### Genogram with manually added legend item

```dsl
genogram
  legend.item dv: "Domestic violence" (kind: line, color: #b71c1c, pattern: zigzag)
  ...
```

### Disabling a legend

```dsl
sociogram
  legend: off
  ...
```

---

## Implementation files

| Path | Role |
|---|---|
| [`src/core/types.ts`](../../src/core/types.ts) | `LegendSpec`, `LegendItem`, `LegendOverrides`, `LegendPosition`, `LegendItemKind` |
| [`src/core/legend.ts`](../../src/core/legend.ts) | Shared renderer, `applyLegendOverrides()`, swatch primitives |
| [`src/core/legend-parser.ts`](../../src/core/legend-parser.ts) | DSL directive parser shared across diagram parsers |
| `src/diagrams/<type>/legend.ts` | Per-diagram `buildXxxLegend(ast): LegendSpec` |

---

## Adding a legend to a new diagram

1. Decide the tier (A / B / C). See the table above.
2. Author the per-diagram standard doc's `## Legend` section listing sections and keys.
3. Implement `buildXxxLegend(ast)` returning a `LegendSpec` with `mode: "on"` (or `"auto"` for conditional cases like blockdiagram).
4. In the diagram parser, accept legend directives via `parseLegendDirective(line, overrides)` from `src/core/legend-parser.ts`.
5. In the diagram renderer, after layout: call `applyLegendOverrides(autoSpec, ast.legendOverrides)`, then `renderLegend(...)`. If the position is `outside-right`/`outside-bottom`, expand `viewBox` accordingly.
6. Add tests: parser captures overrides, builder emits expected items, renderer produces expected SVG snapshot.
