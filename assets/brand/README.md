# Schematex brand / media kit

Press-ready assets for Schematex. Everything here is derived from the design system in [`docs/`](../../docs/) and [`src/core/theme.ts`](../../src/core/theme.ts) — don't edit without syncing those sources.

> **Tagline:** *Standards-as-code for professional diagrams.*

---

## Contents

```
brand/
├── mark/          # logo mark, 5 variants
├── wordmark/      # typographic "Schematex" (inline + display)
├── lockup/        # mark + wordmark, 3 surfaces
├── favicon/       # 16/32/64/192/512 + apple-touch + .ico + manifest
├── og/            # Open Graph cards, 1200×630
├── heroes/        # canonical diagram per cluster (SVG + PNG)
└── README.md      # this file
```

All SVGs use `viewBox` + `currentColor` where reasonable, so they scale and recolor cleanly. PNG rasterizations are included next to their SVGs for consumers that can't render SVG (Twitter, Slack previews, legacy docs).

---

## The mark

Two square **brackets** enclose a two-node graph connected by an **S-curve**. The brackets say *"defined entity / schema"*; the curve + endpoints say *"connection between two things"*. Together: a *schema of connection* — and the curve hides an *S* for *Schematex*.

Built on a **24×24 grid**. Brackets at `x = 2.5` and `x = 21.5`. Endpoints at `(16, 7)` and `(8, 17)`. All strokes `2px`; node radius `2.2u`.

| File | Use |
|---|---|
| [`mark/mark.svg`](mark/mark.svg) | Default. `currentColor` throughout — inherits from parent `color`. |
| [`mark/mark-duotone.svg`](mark/mark-duotone.svg) | Brackets & nodes in ink (`#0f172a`), curve in accent (`#2563eb`). Use when you want the full brand coloring fixed. |
| [`mark/mark-outline.svg`](mark/mark-outline.svg) | Ring endpoints + trimmed curve. For app icons on solid grounds (inverts cleanly). |
| [`mark/mark-dark.svg`](mark/mark-dark.svg) | Catppuccin Mocha palette (`#cdd6f4` + `#89b4fa`). Use on `#1e1e2e`. |
| [`mark/mark-mono.svg`](mark/mark-mono.svg) | Pure black. Compliance / print / single-color reproduction. |

**Minimum size:** 16 px. Below that, switch to the outlined variant — solid endpoints merge.

---

## Wordmark

| File | Use |
|---|---|
| [`wordmark/wordmark-inline.svg`](wordmark/wordmark-inline.svg) | Single-word `Schematex`, system-ui 600, `letter-spacing: -0.015em`. Body, nav, footer. |
| [`wordmark/wordmark-display.svg`](wordmark/wordmark-display.svg) | `Schema` + mono subscript `tex`. Hero / masthead / OG only. |

**Brand spelling (prose):** `Schematex`. Never `SchemaTex`, `SchemaTeX`, `SCHEMATEX`, or `schematex` at sentence start. Lowercase `schematex` is reserved for the package name in code blocks.

SVGs ship as `<text>` — convert to outlines if you need pixel-exact rendering outside a browser.

---

## Lockups (mark + wordmark)

Mark aligned to cap-height. Gap = `0.35 × mark width`.

| File | Surface |
|---|---|
| [`lockup/lockup-horizontal.svg`](lockup/lockup-horizontal.svg) | Default, on light background |
| [`lockup/lockup-on-accent.svg`](lockup/lockup-on-accent.svg) | Blue (`#2563eb`) — uses `mark-outline` |
| [`lockup/lockup-on-ink.svg`](lockup/lockup-on-ink.svg) | Dark (`#1e1e2e`, Catppuccin Mocha) |

---

## Favicon

| File | Use |
|---|---|
| `favicon/favicon.ico` | Legacy browsers (contains 16/32/48) |
| `favicon/favicon-16.{svg,png}` | Browser tab |
| `favicon/favicon-32.{svg,png}` | Browser tab (HiDPI) |
| `favicon/favicon-64.{svg,png}` | App shelf — ink bg + accent curve |
| `favicon/favicon-192.{svg,png}` | Android / PWA — Catppuccin dark variant |
| `favicon/favicon-512.{svg,png}` | PWA + maskable |
| `favicon/apple-touch-icon.{svg,png}` | iOS home screen (180×180) |
| `favicon/site.webmanifest` | PWA manifest |

### Drop-in HTML

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon-32.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#2563eb">
```

---

## Open Graph / social cards

1200 × 630. Left pane: brand lockup + headline + stat line. Right pane: a **real diagram** from the library — never marketing illustration.

| File | Use |
|---|---|
| [`og/og-default.svg`](og/og-default.svg) / `.png` | Default — genogram hero, white ground |
| [`og/og-accent.svg`](og/og-accent.svg) / `.png` | Announcement — ladder hero, accent ground |

### Drop-in meta

```html
<meta property="og:image" content="https://schematex.dev/og-default.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://schematex.dev/og-default.png">
```

**Rotation rule:** rotate the right-pane diagram with each release — genogram for clinical posts, ladder for industrial, entity for corporate. Never invent a diagram the library can't actually render.

---

## Cluster heroes

One canonical diagram per domain cluster. Use these as in-line hero images in READMEs, docs landing sections, and blog posts. Both SVG (source) and PNG (1200px wide) included.

| Cluster | File |
|---|---|
| 👪 **Relationships** | [`heroes/relationships-genogram.svg`](heroes/relationships-genogram.svg) — three-generation genogram (McGoldrick 2020) |
| ⚡ **Electrical & Industrial** | [`heroes/industrial-ladder.svg`](heroes/industrial-ladder.svg) — motor start/stop (IEC 61131-3) |
| 🏢 **Corporate / Legal** | [`heroes/corporate-entity.svg`](heroes/corporate-entity.svg) — holding-company structure |
| 🐟 **Causality / Analysis** | [`heroes/causality-fishbone.svg`](heroes/causality-fishbone.svg) — website traffic drop Ishikawa |

These are the *same files* that live in [`examples/`](../../examples/) — duplicated here for a self-contained press kit.

---

## Color tokens

The primary brand palette, same values shipped in [`src/core/theme.ts`](../../src/core/theme.ts).

| Role | Hex | Notes |
|---|---|---|
| `accent` | `#2563eb` | Blue-600. The **only** CTA color. Don't introduce new accents. |
| `text` / ink | `#0f172a` | Slate-900 |
| `textMuted` | `#475569` | Slate-600 |
| `stroke` | `#334155` | Slate-700 |
| `fillMuted` | `#f1f5f9` | Slate-100 |
| `positive` | `#059669` · `negative` `#dc2626` · `warn` `#d97706` | Status colors — not for brand use |

**Dark (Catppuccin Mocha):** `bg #1e1e2e` · `text #cdd6f4` · `accent #89b4fa`.

---

## Rules (short version)

- Do **not** introduce new accent colors or gradients on diagram-adjacent surfaces.
- Do **not** recolor industrial diagrams (circuit / ladder / SLD / logic) — they stay B&W per IEEE 315 / IEC 61131-3.
- Do **not** stretch, rotate, or add drop shadows to the mark.
- Do **not** typeset the wordmark in all-caps or split the letters.
- Minimum clear-space around the lockup = height of one node (`2.2u` ≈ 9% of mark width).

---

## Rebuilding

Favicons + OG PNGs are generated from the SVGs:

```bash
# Favicons
cd assets/brand/favicon
for s in 16 32 64 192 512; do
  rsvg-convert -w $s -h $s favicon-$s.svg -o favicon-$s.png
done
rsvg-convert -w 180 -h 180 apple-touch-icon.svg -o apple-touch-icon.png

# OG cards
cd ../og
rsvg-convert -w 1200 -h 630 og-default.svg -o og-default.png
rsvg-convert -w 1200 -h 630 og-accent.svg  -o og-accent.png

# Heroes
cd ../heroes
for f in *.svg; do rsvg-convert -w 1200 "$f" -o "${f%.svg}.png"; done
```

The `.ico` requires Pillow:

```bash
python3 -c "
from PIL import Image
sizes = [16, 32, 48]
imgs = [Image.open(f'favicon-{s}.png') for s in sizes]
imgs[0].save('favicon.ico', sizes=[(s,s) for s in sizes], append_images=imgs[1:])
"
```
