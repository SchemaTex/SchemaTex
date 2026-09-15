# Genogram symbol inventory

84 drawn symbols. The script is the source of truth for SVG geometry and manifest metadata; every `dsl` value is a list of strings. Running `node scripts/visual-eval/symbols/draw-genogram.mjs` rebuilds the manifest and removes obsolete SVGs.

The accepted `male`, `female`, `deceased-male`, `index-person`, `divorced` and `conflict` drawings are preserved. All samples retain the existing 48-unit person shapes, palette and line weights. MFI condition regions use black ink (`#1F2937`); unfilled clinical regions remain unfilled. Relationship samples retain the library's horizontal layout.

## Sources and conflicts

- **MFI is primary.** [MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15][mfi] defines the MFI forms below. Household and placement examples are on continuation p. 16, as identified in the supplied text extract. The index-person double outline is an accepted exemplar drawing, not a symbol shown on the supplied pages. Unverifiable fourth-edition figure references have been removed.
- **Condition fills carry specific meanings.** MFI left-half black means physical or psychological illness; bottom-half black means alcohol or drug abuse; bottom-half hatching means suspected alcohol or drug abuse; three-quarters black means serious mental/physical problems plus substance abuse. Remission and the two recovery variants all fill the lower-left quarter, but use different dividing lines. Other full, half, quarter, whole-person texture and radial fills are tier 3: legend-defined; not an MFI convention.
- **GenoPro supplements missing relationships.** [GenoPro's emotional-relationship legend][geno] supplies best friends, jealous, love, in love, admirer/fan, limerence, distrust, manipulative, controlling, never met, neglect and distant-hostile. McGoldrick has no symbol for these in the supplied MFI handout. Their published geometry is used with this library's existing colours and weights. Where both sources define a relationship, MFI wins: abuse forms use MFI zigzags and arrowheads, fused is three lines, and distant uses short dashes. Love uses a hollow circle, never a heart. Focused On uses the MFI plain filled arrow. Unsupported magnifier and conflict-hash decorations have been removed.
- **Descent conventions conflict.** MFI adoption is a solid line plus a parallel dashed line labelled A and the adoption date; [GenoPro uses a dashed line][symbols]. MFI foster descent is dashed and labelled with the dates the child lived with the family; GenoPro uses dots. Both drawings here follow MFI. MFI miscarriage is a hollow circle; GenoPro uses a crossed triangle, so the MFI form takes precedence.
- **Pedigree borrowings require an explicit legend.** A diamond means a pet in MFI and GenoPro, and the library draws it that way (`pet`). The pedigree meaning of a diamond, unknown or non-binary gender, comes from [Bennett 2022 pedigree nomenclature][bennett]; the genogram engine draws a question mark for `[unknown]` and `[other]` unless a shape is explicit. Explicit diamonds, nonbinary/intersex shapes and the separate unknown-siblings diamond remain distinct cases. Adoption brackets, consanguinity, no-children and infertility terminals, unknown zygosity, and donor/surrogate letters are also tier 3 pedigree borrowings, not MFI genogram symbols. MFI donor examples label the roles in words.

Renamed files: `distant-dotted-line` → `distant-dashed-line`; `immigration-arrow` → `immigration-mark`. The misleading legacy filenames for love, in-love, admirer, limerence, distrust, never-met, neglect, manipulative and controlling are retained as IDs; their labels and drawings now describe the published forms.

## Symbols

Source labels below link to the publications. “Local” means the supplied sources do not establish this library extension; it is not presented as an MFI convention. DSL examples describe parser vocabulary. The engine draws the pregnancy and pregnancy-loss forms, compound hostile and abuse lines, and GenoPro emotional marks described here; remaining differences are listed below.

### Tier 1

| Symbol | DSL | Source |
|---|---|---|
| [Male](male.svg) (`male`) | `[male]`; `[M]` | [MFI][mfi] |
| [Female](female.svg) (`female`) | `[female]`; `[F]` | [MFI][mfi] |
| [Deceased (male)](deceased-male.svg) (`deceased-male`) | `[male, deceased]` | [MFI][mfi] |
| [Index person (identified patient)](index-person.svg) (`index-person`) | `[index]`; `[female, index]` | Accepted exemplar; not shown in supplied MFI pages |
| [Divorce](divorced.svg) (`divorced`) | `A -divorced- B` | [MFI][mfi] |
| [Conflict (emotional relationship)](conflict.svg) (`conflict`) | `A -conflict- B` | [MFI][mfi] |
| [Marriage / ordinary connection](marriage-line.svg) (`marriage-line`) | `A -- B`; `A -normal- B`; `A -harmony- B` | [MFI][mfi] |
| [Biological descent](biological-descent-line.svg) (`biological-descent-line`) | `A -- B ↳   child [male]` | [MFI][mfi] |
| [Sibship](sibship-bar.svg) (`sibship-bar`) | `A -- B ↳   child1 [male] ↳   child2 [female]` | [MFI][mfi] |
| [Separation](separation-slash.svg) (`separation-slash`) | `A -/- B`; `A -// B` | [MFI][mfi] |
| [Shared household](household-enclosure.svg) (`household-enclosure`) | `— (not expressible)` | [MFI][mfi] (continuation p. 16) |

### Tier 2

| Symbol | DSL | Source |
|---|---|---|
| [Cohabitation](cohabitation-line.svg) (`cohabitation-line`) | `A ~ B` | [MFI][mfi] |
| [Ended cohabitation](cohabitation-ended-line.svg) (`cohabitation-ended-line`) | `A ~/~ B` | Local; source not established |
| [Adoptive descent](adoptive-descent-line.svg) (`adoptive-descent-line`) | `A -- B ↳   child [adopted]` | [MFI][mfi] |
| [Foster / guardian descent](foster-descent-line.svg) (`foster-descent-line`) | `A -- B ↳   child [foster]`; `A -- B ↳   child [guardian]` | [MFI][mfi] |
| [Fraternal twins](twin-fan.svg) (`twin-fan`) | `A -- B ↳   child1 [twin-fraternal] ↳   child2 [twin-fraternal]` | [MFI][mfi] |
| [Identical twins](identical-twin-bar.svg) (`identical-twin-bar`) | `A -- B ↳   child1 [twin-identical] ↳   child2 [twin-identical]` | [MFI][mfi] |
| [Current pregnancy](pregnancy-triangle.svg) (`pregnancy-triangle`) | `[pregnancy]` | [MFI][mfi] |
| [Miscarriage](miscarriage-circle.svg) (`miscarriage-circle`) | `[miscarriage]`; `[miscarried]`; `[miscarry]` | [MFI][mfi] |
| [Induced abortion](induced-abortion-cross.svg) (`induced-abortion-cross`) | `[abortion]`; `[aborted]` | [MFI][mfi] |
| [Stillbirth](stillbirth-symbol.svg) (`stillbirth-symbol`) | `[stillborn]`; `[stillbirth]`; `[stillbirths]` | [MFI][mfi] |
| [Close relationship](close-double-line.svg) (`close-double-line`) | `A -close- B`; `A -friendship- B` | [MFI][mfi] |
| [Fused relationship](fused-triple-line.svg) (`fused-triple-line`) | `A -fused- B` | [MFI][mfi] |
| [Distant relationship](distant-dashed-line.svg) (`distant-dashed-line`) | `A -distant- B` | [MFI][mfi] |
| [Emotional cutoff](cutoff-break.svg) (`cutoff-break`) | `A -cutoff- B` | [MFI][mfi] |
| [Close and hostile](close-hostile-line.svg) (`close-hostile-line`) | `A -close-hostile- B` | [MFI][mfi] |
| [Fused and hostile](fused-hostile-line.svg) (`fused-hostile-line`) | `A -fused-hostile- B` | [MFI][mfi] |
| [Physical abuse](physical-abuse-line.svg) (`physical-abuse-line`) | `A -physical-abuse-> B` | [MFI][mfi] |
| [Emotional abuse](emotional-abuse-line.svg) (`emotional-abuse-line`) | `A -emotional-abuse-> B` | [MFI][mfi] |
| [Sexual abuse](sexual-abuse-line.svg) (`sexual-abuse-line`) | `A -sexual-abuse-> B` | [MFI][mfi] |
| [Physical or psychological illness](condition-half-left.svg) (`condition-half-left`) | `[conditions: name(half-left, #1F2937)]` | [MFI][mfi] |
| [Alcohol or drug abuse](condition-half-bottom.svg) (`condition-half-bottom`) | `[conditions: name(half-bottom, #1F2937)]` | [MFI][mfi] |
| [Serious mental/physical problems plus substance abuse](condition-three-quarter-fill.svg) (`condition-three-quarter-fill`) | `— (not expressible)` | [MFI][mfi] |

### Tier 3

| Symbol | DSL | Source |
|---|---|---|
| [Pet](pet.svg) (`pet`) | — (no dedicated pet kind; `[shape: diamond]` selects a diamond) | MFI 2017; [GenoPro symbols](https://genopro.com/genogram/symbols/) |
| [Adoption brackets](adoption-brackets.svg) (`adoption-brackets`) | `A -- B ↳   child [adopted]` | [Bennett 2022][bennett] |
| [Full condition fill](condition-full-fill.svg) (`condition-full-fill`) | `[conditions: name(full, #FCD34D)]` | Local; legend-defined |
| [Right half condition fill](condition-half-right.svg) (`condition-half-right`) | `[conditions: name(half-right, #FCD34D)]` | Local; legend-defined |
| [Consanguineous partnership](consanguinity-double-line.svg) (`consanguinity-double-line`) | `A == B` | [Bennett 2022][bennett] |
| [Engagement](engagement-diamond.svg) (`engagement-diamond`) | `A -o- B` | Local; source not established |
| [Triplets / multiple birth](multiple-birth-fan.svg) (`multiple-birth-fan`) | `A -- B ↳   child1 [twin-fraternal] ↳   child2 [twin-fraternal] ↳   child3 [twin-fraternal]` | Local; source not established |
| [Twins, zygosity unknown](unknown-zygosity-mark.svg) (`unknown-zygosity-mark`) | `— (not expressible)` | [Bennett 2022][bennett] |
| [No children](no-children-terminal.svg) (`no-children-terminal`) | `— (not expressible)` | [Bennett 2022][bennett] |
| [Infertility](infertility-terminal.svg) (`infertility-terminal`) | `— (not expressible)` | [Bennett 2022][bennett] |
| [Placement into a family](placement-transfer-arrow.svg) (`placement-transfer-arrow`) | `— (not expressible)` | [MFI][mfi] (continuation p. 16) |
| [Donor / surrogate connection](donor-descent-line.svg) (`donor-descent-line`) | `— (not expressible)` | [Bennett 2022][bennett] |
| [Repaired cutoff](repaired-cutoff-mark.svg) (`repaired-cutoff-mark`) | `— (not expressible)` | [MFI][mfi] |
| [Caretaker relationship](caretaker-relationship-mark.svg) (`caretaker-relationship-mark`) | `— (not expressible)` | [MFI][mfi] |
| [Spiritual connection](spiritual-connection-line.svg) (`spiritual-connection-line`) | `— (not expressible)` | [MFI][mfi] |
| [Family secret](family-secret-mark.svg) (`family-secret-mark`) | `— (not expressible)` | [MFI][mfi] |
| [Immigration adornment](immigration-mark.svg) (`immigration-mark`) | `— (not expressible)` | [MFI][mfi] |
| [Gay / lesbian orientation](gay-lesbian-overlay.svg) (`gay-lesbian-overlay`) | `— (not expressible)` | [MFI][mfi] |
| [Bisexual orientation](bisexual-overlay.svg) (`bisexual-overlay`) | `— (not expressible)` | [MFI][mfi] |
| [Clinical letter marker](clinical-letter-marker.svg) (`clinical-letter-marker`) | `— (not expressible)` | [MFI][mfi] |
| [Boxed age at death](age-at-death-box.svg) (`age-at-death-box`) | `— (not expressible)` | [MFI][mfi] |
| [Physical or psychological illness in remission](remission-recovery-fill.svg) (`remission-recovery-fill`) | `— (not expressible)` | [MFI][mfi] |
| [Suspected alcohol or drug abuse](suspected-addiction-fill.svg) (`suspected-addiction-fill`) | `— (not expressible)` | [MFI][mfi] |
| [Upper half condition fill](condition-half-top.svg) (`condition-half-top`) | `[conditions: name(half-top, #FCD34D)]` | Local; legend-defined |
| [Upper left quarter fill](condition-quarter-top-left.svg) (`condition-quarter-top-left`) | `[conditions: name(quad-tl, #FCD34D)]` | Local; legend-defined |
| [Upper right quarter fill](condition-quarter-top-right.svg) (`condition-quarter-top-right`) | `[conditions: name(quad-tr, #FCD34D)]` | Local; legend-defined |
| [Lower left quarter fill](condition-quarter-bottom-left.svg) (`condition-quarter-bottom-left`) | `[conditions: name(quad-bl, #FCD34D)]` | Local; legend-defined |
| [Lower right quarter fill](condition-quarter-bottom-right.svg) (`condition-quarter-bottom-right`) | `[conditions: name(quad-br, #FCD34D)]` | Local; legend-defined |
| [Whole-person hatching](condition-hatched-fill.svg) (`condition-hatched-fill`) | `[conditions: name(striped)]` | Local; legend-defined |
| [Whole-person stippling](condition-dotted-fill.svg) (`condition-dotted-fill`) | `[conditions: name(dotted)]` | Local; legend-defined |
| [Five condition sectors](condition-radial-sectors.svg) (`condition-radial-sectors`) | `— (not expressible)` | Local; legend-defined |
| [External person](external-person-outline.svg) (`external-person-outline`) | `[external: true]` | Local; source not established |
| [Siblings with unknown parents](sibling-only-bracket.svg) (`sibling-only-bracket`) | `A [male] ↳ B [female, sibling-of: A]` | Local; source not established |
| [Unknown siblings](unknown-siblings-placeholder.svg) (`unknown-siblings-placeholder`) | `A -- B ↳   ?`; `[unknown-siblings]` | Local; source not established |
| [Stepchild connector](step-child-connector.svg) (`step-child-connector`) | `A -- B ↳   child [step]` | Local; source not established |
| [Focused on](emotional-arrowhead.svg) (`emotional-arrowhead`) | `A -focused-> B` | [MFI][mfi] |
| [Love](love.svg) (`love`) | `A -love- B` | [GenoPro][geno] |
| [In love](in-love.svg) (`in-love`) | `A -inlove- B` | [GenoPro][geno] |
| [Distant and hostile](distant-hostile.svg) (`distant-hostile`) | `A -distant-hostile- B` | [GenoPro][geno] |
| [Never met](never-met.svg) (`never-met`) | `A -nevermet- B` | [GenoPro][geno] |
| [Neglect](neglect.svg) (`neglect`) | `A -neglect-> B` | [GenoPro][geno] |
| [Manipulative relationship](manipulative.svg) (`manipulative`) | `A -manipulative-> B` | [GenoPro][geno] |
| [Controlling relationship](controlling.svg) (`controlling`) | `A -controlling-> B` | [GenoPro][geno] |
| [Distrust](distrust.svg) (`distrust`) | `A -distrust- B` | [GenoPro][geno] |
| [Admirer](admirer.svg) (`admirer`) | `A -admirer-> B` | [GenoPro][geno] |
| [Limerence](limerence.svg) (`limerence`) | `A -limerence-> B` | [GenoPro][geno] |
| [In recovery from alcohol or drug abuse](substance-abuse-recovery-fill.svg) (`substance-abuse-recovery-fill`) | `— (not expressible)` | [MFI][mfi] |
| [In recovery from substance abuse and illness](combined-recovery-fill.svg) (`combined-recovery-fill`) | `— (not expressible)` | [MFI][mfi] |
| [Best friends / very close](best-friends.svg) (`best-friends`) | `A -bestfriends- B` | [GenoPro][geno] |
| [Jealous](jealous.svg) (`jealous`) | `A -jealous-> B` | [GenoPro][geno] |

## Engine gaps

The engine draws pregnancy as a hollow triangle with a solid outline, miscarriage as a hollow circle, induced abortion as an X, and stillbirth as a small square with an X. Close-hostile and fused-hostile retain their parallel lines beside the zigzag. GenoPro marks include the hollow circles, boxed X, ticks, open arrows and jealous diamond described in the symbol notes.

Adoption/foster geometry remains different: adoption lacks the parallel dashed mark and brackets, and primary foster links do not use the MFI dashed descent. Consanguinity uses one partnership line, and engagement lacks its midpoint diamond. Other unsupported symbols and condition textures remain identified in their DSL entries and notes. Genogram has no symbol catalog, so manifest `engine` fields are null even when the parser and renderer support the form.

Household enclosures, pedigree terminals and role letters, repaired cutoff, caretaker and spiritual relationships, orientation and immigration marks, boxed age at death, and named remission/recovery variants lack dedicated DSL entries. Their metadata uses `["— (not expressible)"]`. Generic condition fills do not provide the clinical meaning or dividing lines of the MFI variants.

[mfi]: https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf
[geno]: https://genopro.com/genogram/emotional-relationships/
[symbols]: https://genopro.com/genogram/symbols/
[bennett]: https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621
