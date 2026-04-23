# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.2] — 2026-04-23

### Added — Mindmap rich content (inline markdown)
- **Inline markdown** in every mindmap node: `**bold**`, `*italic*`, `` `code` ``, `[text](url)` links, `[x]` / `[ ]` checkbox task items
- Multi-line text wrapping: labels wrap at `maxLabelWidth` (new `%% maxLabelWidth: N` directive, default 240px)
- New `InlineToken` discriminated union in `src/core/types.ts` (`text | code | link | checkbox`)
- New `MindmapLabelLine` type; `MindmapLayoutNode` gains `fontSize` and `lines` fields
- New `src/diagrams/mindmap/inline.ts` — zero-dependency inline tokenizer, measurer, and word-wrapper
- Theme tokens for rich content: `codeFg`, `codeBg`, `linkColor`, `checkboxStroke`, `checkboxFill` across all three themes

### Changed — Markmap-style visual redesign
- **All nodes** now use a single underline-based visual: no more root capsule border, no box on any node
- Bezier edges terminate precisely at the underline stroke — pixel-perfect continuity (fixed 2px y-offset bug)
- Same-depth nodes share the same `labelWidth` (equalized globally), so all bezier curves at a depth span identical horizontal distances
- Root node gets a 1.5× wrap budget (proportional to its larger 20pt font) so short titles stay on one line
- Stroke widths taper by depth: root underline 2.4px → depth-1 2.2px → depth-2 1.6px → depth-3+ 1.2px; monochrome theme scales all widths × 0.7
- `layoutMap` now scans both L/R sides with a single `maxLW` pass for symmetric equalization

### Updated
- `docs/reference/20-MINDMAP-STANDARD.md` fully rewritten to reflect current implementation (inline markdown syntax, markmap-style layout rules, updated AST + theme types, 13 test cases)

---

## [0.2.0] — 2026-04-05

### Added
- Decision Tree diagram type
- Flowchart diagram type  
- Venn diagram type
- Per-example OG images via resvg on Vercel
- Hero demo GIF in README

### Changed
- Unified plugin API across all diagram renderers
- Renamed library from `lineage` to `schematex`
- Switched license to AGPL-3.0

---

## [0.1.0] — 2026-03-15

### Added
- Core pipeline: Text DSL → Parser → AST → Layout → SVG
- **Relationships:** Genogram (McGoldrick), Ecomap, Pedigree
- **Biological:** Phylogenetic tree (Newick/NHX)
- **Social science:** Sociogram (Moreno sociometry)
- **Engineering — EE/Industrial:** Logic Gate, Circuit (IEEE 315), Timing Diagram, Block Diagram, Ladder Logic (IEC 61131-3), Single-Line Diagram (SLD)
- **Corporate/Legal:** Entity Structure, Fishbone (Ishikawa), Orgchart
- **Mindmap:** Map + Logic-Right styles (basic, no inline markdown)
- Zero-dependency SVG builder (`src/core/svg.ts`)
- Shared theme system with `default`, `monochrome`, `dark` presets
- React component wrapper (`schematex/react`)
- Browser bundle (`schematex/browser`)
- Vitest test suite (432 tests)
