# Pedigree symbol inventory

Tier 1 contains the marks needed for a basic clinical pedigree; Tier 2 adds the standard's other everyday symbols; Tier 3 completes the drafted vocabulary, including explicitly identified legacy and engine-only marks. References are NSGC's [Bennett et al. 2008 recommendations](https://doi.org/10.1007/s10897-008-9169-9) and the [2022 focused revision](https://doi.org/10.1002/jgc4.1621), which takes precedence for new drawings. Usage would count distinct ChatDiagram users whose generated pedigree DSL invokes each mark, excluding victor@mymap.ai; **ChatDiagram usage has not been counted yet**. All usageUsers values are null.

The library copies the accepted pedigree exemplar's scale, palette, font and stroke weights. Engine means actual parser/layout/renderer support, not an engine catalog: pedigree has no catalog and every engine field is null. Accepted-but-misrendered DSL remains listed; ignored tokens are not support. Automatic labels are identified explicitly. A Drawn status records a completed library SVG, not correct engine support or endorsement of a legacy glyph.

The accepted seed drawings are preserved. The tables follow draft tier order even where the seed's original tier differs. Merged symbol families: `male-unaffected` covers `individual-square` and `unfilled-status`; `female-affected` covers `affected-fill`; `proband` covers `referral-arrow`; `deceased-affected` covers `deceased-slash`; `consanguineous-union` covers `consanguinity-line`; `pregnancy-loss` covers `pregnancy-loss-triangle`; `carrier` covers `legacy-carrier-dot`. The contextual `sibship-line` drawing also covers `individual-line`, as its notes state. Each merged row links to its one retained SVG.

The carrier-pattern sample and the engine use a diagonal hatch for `[carrier]`, `[carrier-x]` and `[obligate-carrier]` on every sex shape. The `carrier` dot sample is a legacy reference with no DSL expression. `[presymptomatic]` draws a vertical line meeting the top and bottom edges. Independent condition partitions remain unsupported. The consanguinity seed's figure citation should be 2008 Fig. 2.2b; `A == B` selects the double line.


## Tier 1

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Square: man/boy](male-unaffected.svg) (`individual-square`); merged into `male-unaffected` | `[male]`; `[amab]` aliases to `male` | [2022 §4.1, Fig. 1](https://doi.org/10.1002/jgc4.1621) | yes | Drawn |
| [Circle: woman/girl](individual-circle.svg) (`individual-circle`) | `[female]`; `[afab]` aliases to `female` | [2022 §4.1, Fig. 1](https://doi.org/10.1002/jgc4.1621) | yes | Drawn |
| [Diamond: gender-diverse or unspecified](individual-diamond.svg) (`individual-diamond`) | `[unknown]`, `[uaab]`; default shape | [2022 §4.1, Figs. 1–2](https://doi.org/10.1002/jgc4.1621) | yes | Drawn |
| [Unfilled interior](male-unaffected.svg) (`unfilled-status`); merged into `male-unaffected` | `[unaffected]`; default | [2008 Fig. 1.1–2](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Solid affected fill](female-affected.svg) (`affected-fill`); merged into `female-affected` | `[affected]` | [2008 Fig. 1.2](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Carrier pattern](carrier-pattern.svg) (`carrier-pattern`) | `[carrier]`, `[carrier-x]`, `[obligate-carrier]` | [2022 §4.5](https://doi.org/10.1002/jgc4.1621) | yes: diagonal hatch on every sex shape | Drawn |
| [Partnership line](partnership-line.svg) (`partnership-line`) | `A -- B`; `A ~ B` also renders solid | [2022 §4.2, Fig. 3](https://doi.org/10.1002/jgc4.1621) | yes | Drawn |
| [Descent line from partnership](descent-line.svg) (`descent-line`) | Child indented beneath a couple | [2008 Fig. 2.1, 2.3a](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Horizontal sibship line](sibship-line.svg) (`sibship-line`) | Multiple children indented beneath a couple | [2008 Fig. 2.1](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Individual’s vertical branch](sibship-line.svg) (`individual-line`); merged into `sibship-line` | Child indented beneath a couple | [2008 Fig. 2.1](https://doi.org/10.1007/s10897-008-9169-9) | wrong: pregnancy-loss branches stop at the normal node boundary, above the smaller triangle | Drawn |
| [Proband/consultand pointer](proband.svg) (`referral-arrow`); merged into `proband` | `[proband]`, `[consultand]`; `[affected, proband]` for an affected proband | [2008 Fig. 1.6–7](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Deceased diagonal slash](deceased-affected.svg) (`deceased-slash`); merged into `deceased-affected` | `[deceased]` | [2008 Fig. 1.5](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Generation numeral](generation-numeral.svg) (`generation-numeral`) | Automatic | [2008 Fig. 1 instructions](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Individual number](individual-number.svg) (`individual-number`) | Automatic for lowercase IDs without custom labels | [2008 Fig. 1 instructions](https://doi.org/10.1007/s10897-008-9169-9) | wrong: a custom label replaces numbering; uppercase source IDs also bypass generated numbering | Drawn |

## Tier 2

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Consanguinity double line](consanguineous-union.svg) (`consanguinity-line`); merged into `consanguineous-union` | `A == B` | [2008 Fig. 2.2b](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Ended-relationship break](relationship-break.svg) (`relationship-break`) | `A -/- B` | [2022 Fig. 3](https://doi.org/10.1002/jgc4.1621) | yes | Drawn |
| [Asymptomatic or presymptomatic carrier](presymptomatic-carrier.svg) (`presymptomatic-carrier`) | `[presymptomatic]` | [2008 Fig. 4.3](https://doi.org/10.1007/s10897-008-9169-9); [2022 Fig. 2](https://doi.org/10.1002/jgc4.1621) | yes: vertical line meets both edges | Drawn |
| [Independently patterned half-segments](partitioned-half-fill.svg) (`partitioned-half-fill`) | `legend: t = "Trait" (fill: half-left)` / `half-right`, with `[affected: t]` | [2022 §4.5](https://doi.org/10.1002/jgc4.1621) | wrong: trait fills reach the legend but nodes receive a uniform solid fill | Drawn |
| [Horizontal hatch](horizontal-hatch.svg) (`horizontal-hatch`) | — (not expressible) | [2022 §4.5](https://doi.org/10.1002/jgc4.1621) | no | Drawn |
| [Vertical hatch](vertical-hatch.svg) (`vertical-hatch`) | — (not expressible) | [2022 §4.5](https://doi.org/10.1002/jgc4.1621) | no | Drawn |
| [Pregnancy P inside shape](pregnancy-marker.svg) (`pregnancy-marker`) | `[pregnancy]` | [2008 Fig. 1.9](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Stillbirth: slashed shape with SB](stillbirth-symbol.svg) (`stillbirth-symbol`) | `[stillborn]` | [2008 Fig. 1.8](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Pregnancy-loss triangle](pregnancy-loss.svg) (`pregnancy-loss-triangle`); merged into `pregnancy-loss` | `[sab]`; add `[affected]` for solid fill | [2008 Fig. 1.10, 1.12](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Termination slash across loss triangle](termination-slash.svg) (`termination-slash`) | `[tab]`; `[tab, affected]` | [2008 Fig. 1.11](https://doi.org/10.1007/s10897-008-9169-9) | yes | Drawn |
| [Ectopic pregnancy](ectopic-pregnancy.svg) (`ectopic-pregnancy`) | `[ectopic]` | Bennett 2008 Fig. 1.12; [2025 Correction](https://europepmc.org/articles/PMC11926493) | yes: slashed triangle with ECT below | Drawn |
| [Adoption brackets](adoption-brackets.svg) (`adoption-brackets`) | — (not expressible) | [2008 Fig. 2.3b](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Adoptive descent: dashed line](adoptive-descent-line.svg) (`adoptive-descent-line`) | — (not expressible) | [2008 Fig. 2.3b](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Twin fork: common origin, unjoined branches](twin-fork.svg) (`twin-fork`) | — (not expressible) | [2022 Fig. 3](https://doi.org/10.1002/jgc4.1621) | no | Drawn |
| [Monozygosity crossbar between twin branches](monozygosity-bar.svg) (`monozygosity-bar`) | — (not expressible) | [2008 Fig. 2.3a](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Unknown-zygosity question mark between branches](unknown-zygosity-marker.svg) (`unknown-zygosity-marker`) | — (not expressible) | [2022 Fig. 3](https://doi.org/10.1002/jgc4.1621) | no | Drawn |
| [No-children terminal bar](no-children-bar.svg) (`no-children-bar`) | — (not expressible) | [2008 Fig. 2.3a](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Infertility double terminal bar](infertility-bars.svg) (`infertility-bars`) | — (not expressible) | [2008 Fig. 2.3a](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Verified-evaluation asterisk](evaluation-asterisk.svg) (`evaluation-asterisk`) | — (not expressible) | [2008 Fig. 4.1](https://doi.org/10.1007/s10897-008-9169-9); [2022 Fig. 2](https://doi.org/10.1002/jgc4.1621) | no | Drawn |
| [Below-symbol annotation: sex assigned at birth, clinical findings, dates or reproductive role](individual-annotation.svg) (`individual-annotation`) | `[label: "..."]`; `ectopic` also emits ECT | [2022 Box 1, Figs. 1, 4–5](https://doi.org/10.1002/jgc4.1621) | yes | Drawn |

## Tier 3

| Symbol | DSL name | Standard | Engine | Status |
|---|---|---|---|---|
| [Group count inside shape: number or `n`](group-count.svg) (`group-count`) | — (not expressible) | [2008 Fig. 1.3–4](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Unknown-family-history question mark on ancestry line](unknown-family-history.svg) (`unknown-family-history`) | — (not expressible) | [2008 Fig. 2.3a](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Triplet/higher-multiple common-origin fan](multiple-birth-fan.svg) (`multiple-birth-fan`) | — (not expressible) | [2022 Fig. 3](https://doi.org/10.1002/jgc4.1621) | no | Drawn |
| [Proven-zygosity asterisk on multiple-birth connection](verified-zygosity-marker.svg) (`verified-zygosity-marker`) | — (not expressible) | [2008 Fig. 2.3a](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Donor/conception diagonal connector without partnership](donor-connection.svg) (`donor-connection`) | — (not expressible) | [2008 Fig. 3](https://doi.org/10.1007/s10897-008-9169-9); [2022 Fig. 5](https://doi.org/10.1002/jgc4.1621) | no | Drawn |
| [Direct descent from gestational individual](gestational-descent-line.svg) (`gestational-descent-line`) | — (not expressible) | [2022 Fig. 5](https://doi.org/10.1002/jgc4.1621) | no | Drawn |
| [Relationship-line annotation](relationship-annotation.svg) (`relationship-annotation`) | — (not expressible) | [2008 Fig. 2.2b](https://doi.org/10.1007/s10897-008-9169-9) | no | Drawn |
| [Top-left quadrant fill](quadrant-top-left.svg) (`quadrant-top-left`) | `legend: t = "Trait" (fill: quad-tl)` with `[affected: t]` | [2008 Fig. 1.2](https://doi.org/10.1007/s10897-008-9169-9): partitioning permitted; quadrant position has no fixed meaning | wrong: node is fully filled | Drawn |
| [Top-right quadrant fill](quadrant-top-right.svg) (`quadrant-top-right`) | `legend: t = "Trait" (fill: quad-tr)` with `[affected: t]` | [2008 Fig. 1.2](https://doi.org/10.1007/s10897-008-9169-9): partitioning permitted | wrong: node is fully filled | Drawn |
| [Bottom-left quadrant fill](quadrant-bottom-left.svg) (`quadrant-bottom-left`) | `legend: t = "Trait" (fill: quad-bl)` with `[affected: t]` | [2008 Fig. 1.2](https://doi.org/10.1007/s10897-008-9169-9): partitioning permitted | wrong: node is fully filled | Drawn |
| [Bottom-right quadrant fill](quadrant-bottom-right.svg) (`quadrant-bottom-right`) | `legend: t = "Trait" (fill: quad-br)` with `[affected: t]` | [2008 Fig. 1.2](https://doi.org/10.1007/s10897-008-9169-9): partitioning permitted | wrong: node is fully filled | Drawn |
| [Diagonal hatch](diagonal-hatch.svg) (`diagonal-hatch`) | `legend: t = "Trait" (fill: striped)` with `[affected: t]` | [2008 Fig. 1.2](https://doi.org/10.1007/s10897-008-9169-9): legend-defined hatching; angle not prescribed | wrong: node is fully filled | Drawn |
| [Dotted fill pattern](dotted-fill.svg) (`dotted-fill`) | `legend: t = "Trait" (fill: dotted)` with `[affected: t]` | [2008 Fig. 1.2](https://doi.org/10.1007/s10897-008-9169-9) | wrong: node is fully filled | Drawn |
| [Central carrier dot—legacy](carrier.svg) (`legacy-carrier-dot`); merged into `carrier` | — (not expressible) | [2008 Fig. 4.2](https://doi.org/10.1007/s10897-008-9169-9); superseded by [2022 §4.5](https://doi.org/10.1002/jgc4.1621) | no: carrier statuses draw a hatch | Drawn |
| [Evaluation E notation—legacy](legacy-evaluation-marker.svg) (`legacy-evaluation-marker`) | `[evaluated]` | [2008 Fig. 4 instructions](https://doi.org/10.1007/s10897-008-9169-9); removed by [2022 §4.2](https://doi.org/10.1002/jgc4.1621) | wrong: emits a bare E above the shape; does not implement evaluation-result notation | Drawn |

## Engine gaps

- **Adoption brackets and dashed descent.** `adopted-in` and `adopted-out` are ignored. The engine cannot distinguish adoptive parentage from biological descent.
- **Independent condition and carrier fills.** Trait declarations are stored, but the renderer ignores their node-level patterns and partitions. Multiple findings collapse into one affected fill.
- **Twin and multiple-birth connections.** No operative twin/triplet tokens exist. The exemplar’s monozygotic fork and crossbar are hand-drawn; its `twin-mz` tokens produce ordinary siblings.
- **Donor and gestational connections.** Children must belong to a couple. The engine cannot connect donors without implying partnership, distinguish gestational descent, or combine biological and adoptive parentage. D/S captions alone cannot supply those connections.
- **No-children and infertility terminals.** Both documented tokens are ignored.
- **Verification marks.** There is no positioned evaluation asterisk or proven-zygosity marker; `[evaluated]` produces E instead.
- **Unknown ancestry and grouped relatives.** No ancestry-line question mark or internal number/`n` is available.
- **Relationship annotations.** Degree-of-relatedness captions cannot be attached to a union. Properties after `A -- B` modify B rather than the relationship.

- **Pregnancy-loss branch geometry.** Descent branches stop at the normal node boundary above the smaller loss triangle.
- **Numbering and evaluation notation.** Custom labels and uppercase IDs suppress generated individual numbers. The engine emits E for evaluated and has no positioned evaluation asterisk.

Standard interpretation limits: quadrant positions and diagonal hatch angle are key-defined examples, not fixed clinical codes. The library preserves the accepted drawings; engine support is described separately.
