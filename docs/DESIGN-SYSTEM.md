# Schematex Design System

> Reference for designing the Schematex website, marketing assets, and any surface that sits around generated diagrams. Everything here is already implemented in the core library — the website should **adopt**, not **reinvent**.

---

## 1. Product positioning

**Tagline:** *Standards-as-code for professional diagrams.*

**Three pillars:**

1. **Standards-compliant** — every diagram corresponds to a real published standard (McGoldrick, IEC 61131-3, IEEE 315, Newick, …)
2. **Zero runtime dependency** — no D3, no dagre, no parser generator
3. **LLM-native** — DSLs designed to be produced by language models

**Tone:** technical, precise, engineer-calm. Not flashy. Think Linear / Resend / Notion-docs aesthetic rather than Stripe-consumer or Vercel-gradients. No AI-bro glow effects. No emojis in UI chrome.

---

## 2. The four diagram clusters

These are the organizing rails of the product. Website nav, landing-page sections, and documentation should cluster around these four — not a flat list of 13.

| Cluster | Icon-bucket | Diagrams |
|---|---|---|
| 👪 **Relationships** | people, kinship | Genogram, Pedigree, Sociogram, Ecomap |
| ⚡ **Electrical & Industrial** | compliance, schematics | Circuit, SLD, Ladder, Logic-gate, Timing |
| 🏢 **Corporate / Legal** | entities, structure | Entity-structure, Block Diagram, Flowchart |
| 🐟 **Causality / Analysis** | thinking, trees | Fishbone, Phylogenetic, Venn, Mindmap, Matrix |

When designing landing sections or feature cards, lead with the **cluster**, not the individual diagram type.

---

## 3. Color system

### 3.1 Three themes

Every diagram supports three presets, which is exactly the palette matrix the website should reflect:

| Theme | When to use | Background |
|---|---|---|
| `default` | Standard web / docs | White (#ffffff) |
| `monochrome` | Print, clinical, B&W compliance | White (#ffffff) |
| `dark` | Dark mode UI | Catppuccin Mocha (#1e1e2e) |

The website **must** demo all three — it's a product differentiator. A top-of-page theme-switcher feels natural.

### 3.2 Base tokens (11 per theme)

These are the universal tokens every diagram uses. The website should adopt the **same values** so the chrome matches the diagrams.

#### `default` (primary palette for website)

| Token | Hex | Purpose |
|---|---|---|
| `bg` | `#ffffff` | Page background |
| `text` | `#0f172a` | Primary text (slate-900) |
| `textMuted` | `#475569` | Secondary text, captions (slate-600) |
| `stroke` | `#334155` | Primary borders (slate-700) |
| `fill` | `#ffffff` | Shape fills |
| `fillMuted` | `#f1f5f9` | Subtle fills, code blocks (slate-100) |
| `accent` | `#2563eb` | Links, focus, CTAs (blue-600) |
| `positive` | `#059669` | Success states (emerald-600) |
| `negative` | `#dc2626` | Errors, destructive (red-600) |
| `neutral` | `#94a3b8` | Muted strokes, dashed separators (slate-400) |
| `warn` | `#d97706` | Warnings, attention (amber-600) |

#### `dark` (for dark-mode UI)

| Token | Hex | Notes |
|---|---|---|
| `bg` | `#1e1e2e` | Catppuccin Mocha base |
| `text` | `#cdd6f4` | — |
| `textMuted` | `#7f849c` | — |
| `stroke` | `#cdd6f4` | Inverted — light strokes on dark bg |
| `fill` | `#313244` | Mantle |
| `fillMuted` | `#45475a` | Surface0 |
| `accent` | `#89b4fa` | Blue |
| `positive` | `#a6e3a1` | Green |
| `negative` | `#f38ba8` | Red |
| `neutral` | `#6c7086` | Overlay0 |
| `warn` | `#fab387` | Peach |

#### `monochrome` (compliance / print)

Everything is `#000000` on `#ffffff` except `textMuted: #555`, `fillMuted: #f0f0f0`, `neutral: #888`. No color whatsoever — this is for IEEE / IEC standard documents.

### 3.3 Category palette (8-color cycle)

Used when a diagram needs **distinguishable categories** — ecomap systems, sociogram groups, phylo clades, fishbone bones, Venn sets, mindmap branches. **Single source of truth across every diagram.**

Default palette (Tailwind 600):

```
#2563eb  blue
#059669  emerald
#d97706  amber
#7c3aed  violet
#dc2626  red
#0891b2  cyan
#db2777  pink
#475569  slate
```

Dark palette (Catppuccin Mocha):

```
#89b4fa  blue      #a6e3a1  green
#fab387  peach     #cba6f7  mauve
#f38ba8  red       #94e2d5  teal
#f5c2e7  pink      #89dceb  sky
```

Use these for website charts, tag chips, cluster badges — never invent a new 8-color palette.

---

## 4. Typography

### 4.1 Scale (3 tiers)

Deliberately restricted. If the website needs something in between, it's a mistake or a one-off.

| Token | Size | Weight | Use |
|---|---|---|---|
| `title` | 16px | bold | Section headers inside diagrams, card titles |
| `label` | 12px | 400 | Body labels, default text |
| `small` | 9px | 400 | Captions, meta, edge weights |

For **website-level typography** (hero, h1/h2/h3), design freely — but stay within the same visual family. Recommended:

| Role | Size | Weight |
|---|---|---|
| Hero | 48–64px | 600 |
| h1 | 32–40px | 600 |
| h2 | 24px | 600 |
| h3 | 18px | 600 |
| Body | 15–16px | 400 |
| Caption | 12–13px | 400 |

### 4.2 Font family

```
system-ui, -apple-system, "Segoe UI", sans-serif
```

No webfonts. Performance and neutrality. If marketing wants a display face for the hero specifically, that's OK — but keep body in system-ui.

### 4.3 Code / DSL snippets

`ui-monospace, SFMono-Regular, Menlo, monospace` at 13–14px. Code blocks use `fillMuted` as background.

---

## 5. Stroke system

Three weights. Same discipline as typography.

| Token | px | Use |
|---|---|---|
| `thin` | 1 | Hairlines, ticks, gridlines |
| `normal` | 2 | Default body strokes, shape outlines, edges |
| `thick` | 3 | Emphasis (proband index, star nodes, centerpieces) |

For website UI chrome: borders on cards/inputs = 1px, focus rings = 2px. Match the diagram feel.

---

## 6. Semantic extensions per diagram family

Different diagrams have their own **specialized** color tokens. Designers don't need to memorize these, but should know they exist so they don't override them in diagram previews.

- **Person / Kinship** (genogram, pedigree): `maleFill` pale blue, `femaleFill` pale pink, `deceasedMark` dark red, `conditionFill` strong blue
- **Biology** (phylogenetic): support-confidence scale — green→yellow→orange→red for clade support values
- **Venn / Set**: softer category fills with `mix-blend-mode: multiply` for overlaps
- **Industrial** (circuit, SLD, ladder, logic): **always monochrome**, per IEEE 315 / IEC 61131-3. Even in "default" theme, these diagrams use black-on-white. Dark theme inverts luminance only — no color ever added.
- **Flowchart**: 6 semantic node classes — `start`, `process`, `decision`, `success`, `danger`, `neutral` — each with paired fill/stroke/text colors
- **Mindmap**: XMind-inspired 8-color palette for branches; main branches get colored underlines

---

## 7. Spacing & layout

Diagrams are laid out mathematically, not via a spacing scale. But for **website chrome** around them, use a standard 4-based scale:

```
4, 8, 12, 16, 24, 32, 48, 64, 96
```

Diagram cards should have generous breathing room (≥32px padding) — the diagrams themselves are dense.

---

## 8. Component motifs the designer should know

When showing diagrams on the website, these motifs repeat across diagram types — treating them consistently will feel coherent:

1. **Title + desc** — every SVG has `<title>` and `<desc>`; surface this as caption under the preview
2. **Dashed lines** — always mean "weak / uncommitted / separated" (ecomap broken link, genogram separated, sociogram isolate)
3. **Double lines** — always mean "reinforced / strong"
4. **Dotted fills with 6-10% opacity** — category backgrounds (fishbone rib zones, mindmap branch shading)
5. **Small red X or slash** — deceased / eliminated / terminated (person diagrams, entity-structure)

---

## 9. Reference examples

The `examples/` directory has canonical SVGs per diagram type. Use these as hero visuals rather than rendering live in the landing page (until we have a playground). Canonical ones:

- `examples/genogram/three-generation.svg` — shows family structure + medical coloring
- `examples/genogram/medical-conditions.svg` — shows symbol overlays

For the other 12 diagrams, generate from the DSL examples in `preview/*.html` — each has 5-10 illustrative cases.

---

## 10. Things the designer should NOT do

- Don't introduce a new accent color. `accent` (blue-600) is the only CTA color.
- Don't use gradients on anything related to diagrams. Flat fills only. (Marketing hero banners outside the diagram frame are OK.)
- Don't use shadow on diagram frames. Subtle 1px `neutral` border only.
- Don't add new font sizes in between 9 / 12 / 16. If the designer wants 14px somewhere, it's probably a "label" usage and should be 12px.
- Don't recolor industrial diagrams. They stay B&W by standard.
- Don't use emojis in product UI chrome. The 4-cluster icon-buckets (👪⚡🏢🐟) are **illustrative references for this doc**, not actual UI.

---

## 11. Source files

| What | Where |
|---|---|
| All tokens | `src/core/theme.ts` |
| Semantic extensions | same file |
| Per-diagram standards | `docs/reference/00-OVERVIEW.md` + `01-*`…`20-*` |
| Live preview per diagram | `preview/*.html` |
| Canonical example SVGs | `examples/` |

---

## Quick designer checklist

- [ ] Website uses the `default` base theme values verbatim (no custom grays/blues)
- [ ] Dark mode uses Catppuccin Mocha base (#1e1e2e, #cdd6f4, etc.)
- [ ] All category chips / charts draw from the 8-color palette, not invented colors
- [ ] Typography stays in 3 tiers for content, with a separate hero scale only for marketing headers
- [ ] Industrial diagrams are NOT recolored in dark mode except luminance inversion
- [ ] Theme switcher is visible on doc pages (users want to preview all three)
