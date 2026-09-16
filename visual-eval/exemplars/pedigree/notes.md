# Pedigree exemplar — Haemophilia A, four generations

**The scenario.** A genetic-counselling chart for haemophilia A, an X-linked recessive
bleeding disorder. The affected great-grandfather (I-1, deceased) gives his single X
chromosome to every daughter, so both of his daughters (II-2, II-3) are *obligate*
carriers — deduced, never tested. One grandson (III-1) is affected; one granddaughter
(III-3) was confirmed a carrier by factor VIII assay. She and her first cousin III-2
marry, so their union is drawn as a double line. Of their four pregnancies, the affected
son IV-1 is the proband (the person whose referral opened the file), one was a
spontaneous loss, and the identical twin daughters are both carriers — identical twins
share a genotype, so the carrier mark cannot appear on only one of them.

**Palette.** The same as the eight pedigree case targets and the engine's default theme, so the family reads as one drawing. The rule: **blue on a symbol says the person is affected or a carrier, and blue means nothing else.** Nothing is tinted by sex, and the proband arrow is drawn in line colour rather than an accent, so it cannot be mistaken for clinical information.

- Slate `#334155` — every line, every symbol outline, the proband arrow and the key's sample symbols.
- Blue `#1565C0` — the solid fill of an affected person and the diagonal hatch of a carrier. Nothing else on the page is blue.
- Paper `#FFFFFF` — an unaffected person, and the part of the deceased slash that crosses a filled symbol.
- Text ink `#0f172a` — the title, the individual numbers and the proband "P".
- Slate `#475569` — secondary captions (d. 1981, obligate, dx 1998, "first cousins"), the subtitle and the "KEY" header.
- Key box only: fill `#f8fafc`, border `#e2e8f0`.

**Why colour is allowed.** The NSGC nomenclature (Bennett et al. 2008, focused revision 2022) prescribes no colours: it asks that a condition be shown by shading or a fill pattern and that the key define what each means. A blue fill and a blue hatch meet that, and they still hold up in black and white — `#1565C0` prints as a dark grey against white paper, so a photocopied chart still shows solid symbol, hatched symbol and empty symbol as three unmistakable states.

**Carrier notation follows the 2022 revision.** Bennett et al. 2022 §4.5 retired the 2008 centre dot ("we recommend that the dot no longer be used to indicate carrier status"): some carriers do show signs, one person can carry several conditions, and a dot is hidden under a condition's fill. A carrier is now drawn with a fill pattern defined in the key; with more than one condition the symbol is divided and each section takes its own pattern. This chart has one condition, so each carrier is a whole symbol filled with a diagonal hatch.

**Type scale.** Title 21/600, subtitle 11.5, generation numeral 15/600, individual
number 12/600, annotation 10.5. One font stack throughout.

**Symbol geometry.** Square 36×36 for male, circle r=18 for female, both centred on the
generation baseline, stroke 1.9; connecting lines 1.5. The carrier hatch is 1.6 blue lines
at a 5px pitch, turned 45°, clipped inside the outline, which is redrawn on top. Deceased
slash runs lower-left to upper-right and overshoots the symbol by 7px; over the
solid-filled I-1 it is drawn in white inside the symbol so the slash stays one continuous
stroke. Pregnancy loss is a small unfilled triangle whose apex receives the descent line.
Identical twins descend from one point on the sibship line with a short horizontal bar
across the fork; that bar is what marks them monozygotic.

**Layout.** Four rows at an even 140px pitch, each sibship line centred under its couple
so no descent ever dog-legs. Partner order is chosen to keep the two sisters adjacent
in generation II, which puts the female partner on the left of one couple — a deliberate
departure from the male-left convention, allowed by the standard when the alternative is
crossing lines, and it keeps the individual numbers running strictly left to right.

**One pattern, two kinds of carrier, told apart in words.** A confirmed carrier and an
obligate carrier carry the same condition, so they take the same pattern. Rather than
invent a second pattern for one condition, the two obligate carriers are captioned
"obligate" and the confirmed one "assayed", and the key spells out the difference.
Positions were solved by script from measured text widths and audited for label-vs-label,
label-vs-line and label-vs-symbol overlap: zero collisions.
