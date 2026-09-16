# 47 — Welding Symbol Standard

*AWS A2.4 / ISO 2553 welding callouts — the reference-line skeleton, weld-glyph catalog, dimension slots, and supplementary symbols.*

Engine: `src/diagrams/welding/`. Type: `welding`. Cluster: ⚡ Electrical & Industrial.

---

## What this is

A welding symbol is a **fixed-skeleton glyph system**, not a graph: a horizontal **reference line** + a **leader arrow** to the joint + a small library of **weld-symbol glyphs** snapped above/below the line, with dimension text in conventional slots. There is **no graph-layout problem** — text and symbol measurements determine spacing within the skeleton. That is why this is a "light" diagram type (a glyph catalog + a near-trivial layout), and it fills the only gap in the EE cluster next to circuit / ladder / SLD.

Two standards, differing only in the reference-line convention:

- **AWS A2.4** (US, default): one reference line. Symbol **below** the line = arrow side; **above** = other side.
- **ISO 2553** System A (`iso-a`): a **solid + dashed** dual line. Arrow-side weld on the **solid** line, other-side on the **dashed** line. For identical specifications on both sides, the dashed line is suppressed and both weld glyphs remain on the solid reference line. Unequal dimensions retain the dashed line even when the weld types match.
- **ISO 2553** System B (`iso-b`): no dashed line, AWS-compatible (below = arrow, above = other).

---

## DSL grammar

```
welding [standard: aws | iso-a | iso-b]   # default aws; optional title after

joint "<label>" {
  arrow: <weldspec>     # weld on the arrow side
  other: <weldspec>     # weld on the other side
  both:  <weldspec>     # shorthand: same weld on both sides
  around                # weld-all-around (open circle at the junction)
  field                 # field / site weld (filled flag at the junction)
  tail: "<text>"        # process / spec / NDE, e.g. "GTAW; WPS-12"
}

<weldspec> = <type> [size=n] [len=n] [pitch=n] [count=n]
                    [angle=deg] [root=n] [throat=n]
                    [contour=flush|convex|concave] [finish=G|M|C|R|H|U]
```

One `joint` block per joint; joints stack vertically as independent bands. Inline (`{ arrow: fillet size=8 }`) and multi-line forms are both accepted. CJK quotes are accepted for labels and tails.

### Weld types (full catalog)

`fillet` · `square` · `vgroove` · `bevel` · `ugroove` · `jgroove` · `flarev` · `flarebevel` · `plug` · `slot` · `spot` · `seam` · `back` · `backing` · `surfacing` · `edge`. Aliases: `v`/`v-groove`→vgroove, `u`→ugroove, `j`→jgroove, `flare-v`→flarev, `flare-bevel`→flarebevel.

### Dimension slots (AWS/ISO identical ordering)

| Slot | Field | Example |
|------|-------|---------|
| left of symbol | `size=` (leg / depth / diameter), `throat=` in parentheses | `8`, `12 (10)` |
| right of symbol | `len=` / `len`-`pitch` (intermittent), ISO `count×len(pitch)` | `50-150`, `3×50 (150)` |
| at the symbol opening | `angle=` (groove included angle) | `60°` |
| inside the groove opening | `root=` (root opening) | `3` |
| outside the weld face | `contour=` (flush bar / convex / concave arc) + `finish=` letter | flush + `G` |

### Supplementary symbols

`around` → open circle at the arrow/reference junction. `field` → filled flag, pole up, pointing toward the tail. `tail:` → process (SMAW/GMAW/GTAW/FCAW/SAW), WPS/procedure number, electrode class, or NDE method (RT/UT/MT/PT/VT).

---

## Validation (the structural differentiator)

The engine flags illegal combinations as AI-readable warnings (non-fatal — it still renders):

- a **fillet** needs a `size=`; a **plug**/**slot** needs a diameter; a **surfacing** weld needs a `throat=` (build-up height);
- `angle=` only applies to groove types (fillet/plug/spot reject it);
- `pitch=` requires `len=` (an intermittent weld is length-pitch);
- `surfacing` is **arrow-side only**; `plug`/`slot`/`surfacing` may not use `both:`;
- groove angle must be 0–180°.

---

## Standard compliance

What is implemented today:

- ✅ AWS A2.4 single reference line; ISO 2553 System A (dual solid+dashed) and System B
- ✅ Full weld-glyph catalog (16 types: fillet, all groove types, plug/slot, spot/seam, back/backing, surfacing, edge)
- ✅ Dimension slots — size, throat `(E)`, length, length-pitch, count×length for ISO-A intermittent notation, separate parenthesized counts for AWS, groove angle, root opening
- ✅ Supplementary symbols — weld-all-around circle, field-weld flag, tail process/spec/NDE
- ✅ Contour (flush / convex / concave) + finish letter (G/M/C/R/H/U)
- ✅ Arrow-side / other-side / both, with per-standard side convention
- ✅ Multi-joint stacking; AI-readable validation of illegal type/side/dimension combinations
- ⏳ Combined weld + NDE symbols (NDE is tail text today)
- ⏳ Arrow-break to indicate the prepared member (bevel/J); straight leader today
- ⏳ Staggered intermittent weld offset; melt-through / consumable-insert glyphs

References:

- American Welding Society (2020). *AWS A2.4: Standard Symbols for Welding, Brazing, and Nondestructive Examination.*
- ISO 2553:2019. *Welding and allied processes — Symbolic representation on drawings — Welded joints.*

---

## Layout (deterministic, no graph)

Each joint is a horizontal band. The leader descends from the left end toward the joint name; the process tail sits at the right end. The name identifies the callout endpoint; no pipe, plate or joint geometry is inferred from free text. The weld-symbol slot is measured from the left endpoint; arrow-side glyphs draw below, other-side above (ISO-A: arrow on solid, other on dashed). Dimension text anchors to measured glyph bounds. The glyph expands when needed to contain a root-opening value; the reference line expands for size and length annotations. Angle, contour, finish and count reserve separate space. Tail notes and joint names wrap to measured widths, and each joint reserves its full height before the next begins.

Glyph orientation and dimension placement are checked against [Miller’s AWS symbol chart](https://contenthub.itwwelding.com/api/public/content/miller-electric-mfg-llc/how-to-guide/52bb4e-welding-symbol-chart.pdf). Fillet contours follow the hypotenuse; U/J grooves retain the standard stem/straight member, and back/backing and surfacing arcs stay on their declared side. This is a callout renderer, not a dimensioned workpiece/CAD renderer.
