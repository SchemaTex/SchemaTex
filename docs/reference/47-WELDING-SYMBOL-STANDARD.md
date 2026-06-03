# 47 — Welding Symbol Standard

*AWS A2.4 / ISO 2553 welding callouts — the reference-line skeleton, weld-glyph catalog, dimension slots, and supplementary symbols.*

Engine: `src/diagrams/welding/`. Type: `welding`. Cluster: ⚡ Electrical & Industrial.

---

## What this is

A welding symbol is a **fixed-skeleton glyph system**, not a graph: a horizontal **reference line** + a **leader arrow** to the joint + a small library of **weld-symbol glyphs** snapped above/below the line, with dimension text in fixed slots. There is **no graph-layout problem** — placement is 100% determined by the skeleton. That is why this is a "light" diagram type (a glyph catalog + a near-trivial layout), and it fills the only gap in the EE cluster next to circuit / ladder / SLD.

Two standards, differing only in the reference-line convention:

- **AWS A2.4** (US, default): one reference line. Symbol **below** the line = arrow side; **above** = other side.
- **ISO 2553** System A (`iso-a`): a **solid + dashed** dual line. Arrow-side weld on the **solid** line, other-side on the **dashed** line. A symmetric weld is drawn on the solid line only, dashed line suppressed.
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
| between symbol & line | `root=` (root opening) | `root 3` |
| above the symbol | `contour=` (flush bar / convex / concave arc) + `finish=` letter | flush + `G` |

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
- ✅ Dimension slots — size, throat `(E)`, length, length-pitch, count×length, groove angle, root opening
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

Each joint is a horizontal band. The reference line runs left→right; the leader arrow leaves the right end down to the joint; the tail `>` sits at the left end. The weld-symbol slot is a fixed x on the line; arrow-side glyphs draw below, other-side above (ISO-A: arrow on solid, other on dashed). Dimension text anchors to fixed offsets off the glyph bounding box. Joints stack with a fixed vertical pitch — no collision solving.
