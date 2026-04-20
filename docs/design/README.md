# docs/design — Design System Reference

Visual design system for Schematex. This directory is the source of truth for typography, color tokens, components, and the website prototype. Reference it before starting any UI work.

---

## Files

| File | What it is |
|------|-----------|
| [`design-system.html`](design-system.html) | Full design system — mark geometry, color tokens, typography scale, spacing, icons, OG card specs. Open in a browser. |
| [`components.html`](components.html) | Component library — all UI components with states: inputs, buttons, badges, tables, code panes, cards, nav, footer. |
| [`site.css`](site.css) | **Authoritative CSS.** The canonical stylesheet for the website. Import this, don't rewrite it. |
| [`preview/`](preview/) | Interactive SPA prototype — open `preview/index.html` in a browser to preview all pages. |

---

## Preview pages

Open `preview/index.html` (no build step — runs React 18 via CDN + Babel standalone).

| Page | What it shows |
|------|--------------|
| **home** | Hero showcase, standards rail, cluster cards, comparison table, CTAs |
| **playground** | DSL editor with syntax highlight, preset switcher, export menu |
| **gallery** | Filterable grid — cluster + use-case filters + search |
| **examples** | Featured worked examples + list |

### File structure

```
preview/
├── index.html          # SPA shell — loads CSS, React CDN, all JSX in order
├── shared.jsx          # DIAGRAMS, DOMAINS, DSL_SAMPLES, renderTokens, TopNav, 13 Stub SVGs
├── page-home.jsx       # SiteFooter, HeroShowcase, Hero, StandardsRail, Clusters, Why, Comparison, FinalCTA, HomePage
├── page-playground.jsx # DSL_TEXT, highlightLine, PlaygroundPage
├── page-gallery.jsx    # USE_CASE_MAP, USE_CASES, DIAGRAM_DESC, GalleryPage
└── page-examples.jsx   # ExamplesPage
```

**Load order is fixed:** `shared.jsx` → `page-home.jsx` (exposes `SiteFooter`) → remaining pages → inline `App`.

---

## Key CSS tokens (from `site.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--accent` | `#2563eb` | Only CTA color |
| `--text` | `#0f172a` | Body text (light) |
| `--text-muted` | `#475569` | Secondary text |
| `--stroke` | `#334155` | Borders (light) / `#a6adc8` (dark) |
| `--fill` | `#f8fafc` | Card backgrounds |
| `--fill-muted` | `#f1f5f9` | Subtle backgrounds |
| `--mono` | system monospace stack | Code, labels, metadata |
| `--accent-soft` | derived | Focus rings, subtle accent tint |
| `--accent-ink` | derived | Text on accent-soft background |
| `--cat-0` … `--cat-7` | cluster colors | Diagram domain badges |

Dark theme (`data-theme="dark"`) uses Catppuccin Mocha: bg `#1e1e2e`, text `#cdd6f4`, accent `#89b4fa`.

---

## How to use this in Claude Code sessions

Start a session with:

> "Read `docs/design/README.md` and `docs/design/site.css` before writing any website code."

For component work, also load `docs/design/components.html` to see existing patterns before inventing new ones.
