# Bacterial diversity — rectangular

This rectangular exemplar uses the same mock tree as the other variant so the two branch styles can be compared. The topology,
branch lengths and bootstrap values are illustrative, not an empirical sequence
analysis. The SVG states this explicitly. Clade names follow the example's
familiar terminology and do not assert a current taxonomic classification.

## Design judgment

There is no universally best tree layout. For the small and medium trees in this
corpus, slanted branches make the common starting point particularly clear.
Rectangular branches remain available for a conventional distance-focused view.
Circular layouts can be useful for many more tips but offer little advantage here.

- Horizontal displacement and the scale bar use the same linear scale in both
  views. Diagonal Euclidean length is not the distance measure. Layout does not
  change the source data or switch to a cladogram. For aligned tips and topology
  only, use the existing `mode: cladogram`; clustering dendrograms stay rectangular.
- Tips retain their actual distances. Thin dashed extensions align the names;
  these guides are explicitly distinguished from evolutionary distance.
- Full species names are italic, with underscores converted to spaces.
- Bootstrap values sit beside internal branches, with their meaning stated below.
- Clade color is reinforced by a bracket and text; interpretation does not rely
  on color alone. Subtle bands organize the label area without obscuring branches.
- No decorative root symbol, card shadows or repeated badges compete with the tree.

The white background, slate text, fine rules and restrained accents follow the
existing exemplar style. Palette: paper `#ffffff`, ink `#1e293b`, muted slate
`#64748b`, teal `#0f766e`, blue `#2563eb`, ochre `#a16207`.
Trebuchet MS gives the title a compact, humanist shape; Verdana keeps scientific
labels clear at smaller sizes. Type scale: title 28, taxon 16, subtitle 13,
section/caption 12, note 11 SVG units. The figure uses a 48-unit page margin,
44-unit tip spacing and 32-unit gaps between clade groups.

## Sources

- [iTOL official documentation](https://itol.embl.de/help.cgi): rectangular and
  other layouts, phylogram versus cladogram, tip alignment guides, label styling,
  support-value display and NHX bootstrap metadata.
- [EMBL-EBI Simple Phylogeny FAQ](https://ebi-biows.gitdocs.ebi.ac.uk/documentation/faqs/phylogeny/):
  the distinction between phylograms and cladograms and interpretation of distance.
- [Letunic and Bork, iTOL v3 (2016)](https://academic.oup.com/nar/article/44/W1/W242/2499315):
  tree annotation and publication-oriented vector export.

The choice and composition here are our design judgment, not a mandated industry
template. No external figure or artwork was copied.

## Reproduction and scope

`source.sx` contains semantic Newick data and named clades, with no coordinates
or routing controls. `scripts/visual-eval/draw-phylo-exemplar.mts` authors these
reference SVGs using the existing parser and SVG builders. It is not imported by
the diagram runtime. Branch positions derive from the source distances; page
geometry is ordinary figure-authoring configuration, not a new DSL API.

Regenerate the SVG, then the eval artifacts:

```sh
npx vite-node scripts/visual-eval/draw-phylo-exemplar.mts
npx vite-node scripts/visual-eval/exemplars.mts --type phylo
```

The authoring script checks each branch’s horizontal displacement against its input distance
and uses that same scale for the ruler. The standard exemplar pipeline validates
the semantic source and renders both the reference and current engine output.
The rendered reference was visually inspected for label collisions, readable
support values, distinct alignment guides and balanced spacing. This adds a
design reference; it does not claim the current engine meets that reference.


## Two-layout review

The six existing Phylo cases were rendered in both layouts and visually reviewed.
Their authored headers explicitly select rectangular, so they keep that choice;
new sources without a layout use slanted. The review caught and fixed loss of the
header after leading comments. Both explicit selection and autodetection are
covered by public-API regression tests. All 80 Phylo tests pass.

A subsequent engine iteration fixed underscore display and clipped scale units,
added aligned label guides, and revised slanted layout to avoid the observed
crossings without changing horizontal branch distances. See the parent README
for the full-corpus review and remaining limits. The reference drawing itself
has not been changed to match the engine. The legacy primate case still has a
malformed Newick source that omits Gibbon; this is not a successful data repair.
