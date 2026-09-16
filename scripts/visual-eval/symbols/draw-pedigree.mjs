/** Draw visual-eval/symbols/pedigree/ — the pedigree symbols in the pedigree exemplar's style.
 *
 *   node scripts/visual-eval/symbols/draw-pedigree.mjs
 *
 * Constants are lifted from visual-eval/exemplars/pedigree/ideal.svg (1 unit = 1 exemplar px):
 * 36 x 36 squares and r = 18 circles outlined slate #334155 at 1.9 on white, lines at 1.5 with
 * round caps, and one clinical colour: blue #1565C0 for the affected fill and the carrier hatch, used
 * for nothing else. Symbols the exemplar does not contain are built from the same parts.
 *
 * Library-wide rules (NSGC, Bennett et al. 2008 and the 2022 focused revision):
 * - Shape says sex or gender, fill says phenotype, an overlay says status. Nothing is tinted by
 *   sex, so blue always means clinical information and survives a black-and-white copy.
 * - The deceased slash runs lower-left to upper-right and overshoots the symbol by 7; over a
 *   filled symbol the part inside is drawn white so the slash stays one visible stroke.
 * - Pointers (proband P, consultand) are line colour, never an accent.
 */
import { n2, writeSet } from "./lib.mjs";

const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const LINE = "#334155", TEXT = "#0f172a", BLUE = "#1565C0", PAPER = "#FFFFFF";
const W_SHAPE = 1.9, W_LINE = 1.5;
const HALF = 18;

const square = (x, y, fill = PAPER) =>
  `<rect x="${n2(x - HALF)}" y="${n2(y - HALF)}" width="${2 * HALF}" height="${2 * HALF}" fill="${fill}" stroke="${LINE}" stroke-width="${W_SHAPE}"/>`;
const circle = (x, y, fill = PAPER) =>
  `<circle cx="${n2(x)}" cy="${n2(y)}" r="${HALF}" fill="${fill}" stroke="${LINE}" stroke-width="${W_SHAPE}"/>`;
const line = (x1, y1, x2, y2, color = LINE, width = W_LINE) =>
  `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
/** Deceased slash: lower-left to upper-right, 7 past the corners; white inside a filled symbol. */
const slash = (x, y, filled) => filled
  ? [line(x - 25, y + 25, x - 18, y + 18, LINE, W_SHAPE), line(x + 18, y - 18, x + 25, y - 25, LINE, W_SHAPE), line(x - 18, y + 18, x + 18, y - 18, PAPER, W_SHAPE)]
  : [line(x - 25, y + 25, x + 25, y - 25, LINE, W_SHAPE)];

// Seed round: six symbols copied from the exemplar, one built from its parts.
const SYMBOLS = [
  {
    id: "male-unaffected", title: "Man or boy, unaffected",
    engine: null, dsl: ["[male]"],
    standard: "Bennett et al. 2022, J Genet Couns 31:1238, §4.1 and Fig. 1 — square for a man or boy (gender identity); sex assigned at birth is annotated below",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a 36 x 36 white square outlined slate at 1.9. White, not tinted by sex.",
    draw: () => [square(0, 0)],
  },
  {
    id: "female-affected", title: "Female, affected",
    engine: null, dsl: ["[female, affected]"],
    standard: "Bennett et al. 2008, Fig. 1 — shading indicates the affected phenotype, defined in the key",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 1, usageUsers: null,
    notes: "The exemplar's solid blue affected fill on its r = 18 circle. NSGC prescribes shading, not a colour; the blue prints as dark grey, so a photocopy still separates affected from unaffected.",
    draw: () => [circle(0, 0, BLUE)],
  },
  {
    id: "carrier-pattern", title: "Carrier (2022 pattern fill)",
    engine: null, dsl: ["[carrier]", "[carrier-x]", "[obligate-carrier]"],
    standard: "Bennett et al. 2022 §4.5 — a carrier is drawn with a fill pattern defined in the key; with several conditions the symbol is divided, one pattern per section",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: true, tier: 1, usageUsers: null,
    notes: "The whole symbol carries a diagonal hatch defined in the key. The engine applies this fill to carrier, carrier-x and obligate-carrier for every sex shape. Independent patterns in condition partitions are not supported.",
    draw: () => [
      `<defs><pattern id="carrier-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="${BLUE}" stroke-width="1.6"/></pattern></defs>`,
      `<circle cx="0" cy="0" r="17" fill="url(#carrier-hatch)"/>`,
      circle(0, 0, "none"),
    ],
  },
  {
    id: "carrier", title: "Carrier dot (2008, retired)",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Bennett et al. 2008 Fig. 4.2; retired by Bennett et al. 2022 §4.5 (\"we recommend that the dot no longer be used to indicate carrier status\")",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: true, tier: 3, usageUsers: null,
    notes: "The 2008 centre dot is a legacy reference for reading older pedigrees. The engine uses a diagonal hatch for carrier, carrier-x and obligate-carrier; none of these statuses draws a centre dot. Independent condition partitions remain unavailable.",
    draw: () => [circle(0, 0), `<circle cx="0" cy="0" r="4.6" fill="${BLUE}"/>`],
  },
  {
    id: "deceased-affected", title: "Deceased, affected",
    engine: null, dsl: ["[male, affected, deceased]"],
    standard: "Bennett et al. 2008, Fig. 1 — diagonal line through the symbol for deceased",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: the slash overshoots by 7 at both ends and turns white where it crosses the blue fill, so it reads as one stroke. Pedigrees use a single slash; the genogram X must not appear here.",
    draw: () => [square(0, 0, BLUE), ...slash(0, 0, true)],
  },
  {
    id: "proband", title: "Proband",
    engine: null, dsl: ["[male, affected, proband]"],
    standard: "Bennett et al. 2008, Fig. 1 — arrow with P at the lower left for the proband",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a 1.8 slate arrow from the lower left with a filled head stopping just short of the corner, and a 13 semibold P at its tail. Line colour, so it cannot be mistaken for clinical information.",
    draw: () => [
      square(0, 0, BLUE),
      line(-46, 46, -26, 26, LINE, 1.8),
      `<path d="M -21 21 L -31.5 24.4 L -24.4 31.5 Z" fill="${LINE}"/>`,
      `<text x="-52" y="50" font-family="${FONT}" font-size="13" font-weight="600" fill="${TEXT}" text-anchor="end">P</text>`,
    ],
  },
  {
    id: "consultand", title: "Consultand",
    engine: null, dsl: ["[consultand]"],
    standard: "Bennett et al. 2022 Fig. 2 — arrow at the lower left without P; shaded only if affected",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "The person seeking counselling: the proband's arrow with no P, on an unshaded symbol because a consultand need not be affected. Drawn separately so the two are never confused.",
    draw: () => [
      square(0, 0),
      line(-46, 46, -26, 26, LINE, 1.8),
      `<path d="M -21 21 L -31.5 24.4 L -24.4 31.5 Z" fill="${LINE}"/>`,
    ],
  },
  {
    id: "consanguineous-union", title: "Consanguineous union",
    engine: null, dsl: ["A == B"],
    standard: "Bennett et al. 2008 Fig. 2.2b; Bennett et al. 2022 Fig. 3 — double line for a consanguineous relationship",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: two 1.5 lines 5.2 apart joining the partners at mid-height, with the descent line leaving from the lower line.",
    draw: () => [line(-37, -2.6, 37, -2.6), line(-37, 2.6, 37, 2.6), line(0, 2.6, 0, 30), square(-55, 0), circle(55, 0)],
  },
  {
    id: "pregnancy-loss", title: "Spontaneous abortion (SAB)",
    engine: null, dsl: ["[sab]"],
    standard: "Bennett et al. 2008, Fig. 1 — small triangle for a pregnancy not carried to term",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Copied from the exemplar: an unfilled 28 x 26 triangle outlined at 1.9 whose apex receives the descent line, shorter than a person's symbol so a loss never reads as a living sibling.",
    draw: () => [line(0, -24, 0, -13), `<path d="M 0 -13 L 14 13 L -14 13 Z" fill="${PAPER}" stroke="${LINE}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`],
  },
  // Inventory additions follow tier and inventory order; accepted seeds above remain unchanged.
  // Seed merge notes (kept outside their frozen metadata):
  // male-unaffected: merged individual-square, unfilled-status.
  // female-affected: merged affected-fill.
  // proband: merged referral-arrow.
  // deceased-affected: merged deceased-slash.
  // consanguineous-union: merged consanguinity-line.
  // pregnancy-loss: merged pregnancy-loss-triangle.
  // carrier: merged legacy-carrier-dot.

  {
    id: "individual-circle", title: "Circle: woman/girl",
    engine: null, dsl: ["[female]", "[afab]"],
    standard: "2022 §4.1, Fig. 1",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: true, tier: 1, usageUsers: null,
    notes: "An unfilled circle uses the exemplar radius and outline for a woman or girl. Under the 2022 revision the shape records gender; sex assigned at birth belongs in a separate annotation.",
    draw: () => [
      circle(0, 0)
    ],
  },
  {
    id: "individual-diamond", title: "Diamond: gender-diverse or unspecified",
    engine: null, dsl: ["[unknown]", "[uaab]"],
    standard: "2022 §4.1, Figs. 1–2",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 1, usageUsers: null,
    notes: "An unfilled diamond occupies the same 36 by 36 bounding box as the seeds. Without a caption it leaves gender or sex unspecified; a gender-diverse person can have a separate birth-sex annotation.",
    draw: () => [
      `<path d="M 0 -18 L 18 0 L 0 18 L -18 0 Z" fill="${PAPER}" stroke="${LINE}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`
    ],
  },
  {
    id: "partnership-line", title: "Partnership line",
    engine: null, dsl: ["A -- B", "A ~ B"],
    standard: "2022 §4.2, Fig. 3",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: true, tier: 1, usageUsers: null,
    notes: "A single solid horizontal line joins the partners at their midpoints. The engine also renders the cohabiting operator as this same line.",
    draw: () => [
      line(-37, 0, 37, 0),
      square(-55, 0),
      circle(55, 0)
    ],
  },
  {
    id: "descent-line", title: "Descent line from partnership",
    engine: null, dsl: ["A -- B\n  child [male]"],
    standard: "2008 Fig. 2.1, 2.3a",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 1, usageUsers: null,
    notes: "A solid descent leaves the midpoint of the partnership and meets the only child. The 140-unit generation spacing and 36-unit symbols match the exemplar.",
    draw: () => [
      line(-37, 0, 37, 0),
      square(-55, 0),
      circle(55, 0),
      line(0, 0, 0, 122),
      square(0, 140)
    ],
  },
  {
    id: "sibship-line", title: "Horizontal sibship line",
    engine: null, dsl: ["A -- B\n  first [male]\n  second [female]"],
    standard: "2008 Fig. 2.1",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 1, usageUsers: null,
    notes: "The horizontal sibship bar distributes descent into individual vertical branches, merging individual-line into this contextual drawing. The engine leaves a gap above smaller pregnancy-loss triangles instead of extending those branches to their apex.",
    draw: () => [
      line(-37, 0, 37, 0),
      square(-55, 0),
      circle(55, 0),
      line(0, 0, 0, 88),
      line(-45, 88, 45, 88),
      line(-45, 88, -45, 122),
      line(45, 88, 45, 122),
      square(-45, 140),
      circle(45, 140)
    ],
  },
  {
    id: "generation-numeral", title: "Generation numeral",
    engine: null, dsl: ["Automatic"],
    standard: "2008 Fig. 1 instructions",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 1, usageUsers: null,
    notes: "A Roman numeral sits in the left margin on the generation baseline. Its 15-unit semibold lettering follows the exemplar.",
    draw: () => [
      `<text x="-45" y="5" font-family="${FONT}" font-size="15" font-weight="600" fill="${TEXT}" text-anchor="middle">II</text>`,
      square(0, 0)
    ],
  },
  {
    id: "individual-number", title: "Individual number",
    engine: null, dsl: ["Automatic for lowercase IDs without custom labels"],
    standard: "2008 Fig. 1 instructions",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 1, usageUsers: null,
    notes: "The pedigree identifier sits below the individual in the exemplar number style. Custom labels and uppercase source IDs currently suppress the engine-generated numbering.",
    draw: () => [
      square(0, 0),
      `<text x="0" y="34" font-family="${FONT}" font-size="12" font-weight="600" fill="${TEXT}" text-anchor="middle">II-1</text>`
    ],
  },
  {
    id: "relationship-break", title: "Relationship no longer exists",
    engine: null, dsl: ["A -/- B"],
    standard: "Bennett et al. 2008 Fig. 2.2a; Bennett et al. 2022 Fig. 3 — two short slashes across the relationship line",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Two parallel slashes cross an uninterrupted partnership line. The engine draws two parallel slashes across an uninterrupted partnership line.",
    draw: () => [
      line(-37, 0, 37, 0),
      line(-9, 7, -1, -7, LINE, W_SHAPE),
      line(1, 7, 9, -7, LINE, W_SHAPE),
      square(-55, 0),
      circle(55, 0)
    ],
  },
  {
    id: "partitioned-half-fill", title: "Independently patterned half-segments",
    engine: null, dsl: ["legend: t = \"Trait\" (fill: half-left)\np [affected: t]", "legend: t = \"Trait\" (fill: half-right)\np [affected: t]"],
    standard: "2022 §4.5",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Horizontal hatching fills the left half and vertical hatching fills the right, with each finding defined independently in the key. The engine accepts half-fill declarations but replaces node patterns with a uniform solid fill.",
    draw: () => [
      square(0, 0),
      line(-18, -12, 0, -12),
      line(-18, -6, 0, -6),
      line(-18, 0, 0, 0),
      line(-18, 6, 0, 6),
      line(-18, 12, 0, 12),
      line(6, -18, 6, 18),
      line(12, -18, 12, 18),
      line(0, -18, 0, 18),
      square(0, 0, "none")
    ],
  },
  {
    id: "horizontal-hatch", title: "Horizontal hatch",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2022 §4.5",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A square contains evenly spaced horizontal hatch lines in the existing slate line style. This is a legend-defined clinical fill with no operative engine expression.",
    draw: () => [
      square(0, 0),
      line(-18, -12, 18, -12),
      line(-18, -6, 18, -6),
      line(-18, 0, 18, 0),
      line(-18, 6, 18, 6),
      line(-18, 12, 18, 12),
      square(0, 0, "none")
    ],
  },
  {
    id: "vertical-hatch", title: "Vertical hatch",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2022 §4.5",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A square contains evenly spaced vertical hatch lines in the existing slate line style. This is a legend-defined clinical fill with no operative engine expression.",
    draw: () => [
      square(0, 0),
      line(-12, -18, -12, 18),
      line(-6, -18, -6, 18),
      line(0, -18, 0, 18),
      line(6, -18, 6, 18),
      line(12, -18, 12, 18),
      square(0, 0, "none")
    ],
  },
  {
    id: "pregnancy-marker", title: "Pregnancy P inside shape",
    engine: null, dsl: ["[pregnancy]"],
    standard: "2008 Fig. 1.9",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 2, usageUsers: null,
    notes: "P inside the diamond denotes an ongoing pregnancy with fetal sex unspecified. The engine draws P inside the person shape.",
    draw: () => [
      `<path d="M 0 -18 L 18 0 L 0 18 L -18 0 Z" fill="${PAPER}" stroke="${LINE}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`,
      `<text x="0" y="4.5" font-family="${FONT}" font-size="13" font-weight="600" fill="${TEXT}" text-anchor="middle">P</text>`
    ],
  },
  {
    id: "stillbirth-symbol", title: "Stillbirth: slashed shape with SB",
    engine: null, dsl: ["[stillborn]"],
    standard: "2008 Fig. 1.8",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A deceased slash crosses the person symbol and SB is written below it to distinguish stillbirth. The engine draws both the slash and SB for stillborn; an explicit deceased token preserves SB.",
    draw: () => [
      square(0, 0),
      ...slash(0, 0, false),
      `<text x="0" y="40" font-family="${FONT}" font-size="10.5" font-weight="400" fill="${TEXT}" text-anchor="middle">SB</text>`
    ],
  },
  {
    id: "termination-slash", title: "Termination slash across loss triangle",
    engine: null, dsl: ["[tab]", "[tab, affected]"],
    standard: "2008 Fig. 1.11",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A lower-left to upper-right slash crosses the small loss triangle, separating termination from spontaneous loss. The slash extends beyond the triangle while its descent still meets the apex.",
    draw: () => [
      line(0, -24, 0, -13),
      `<path d="M 0 -13 L 14 13 L -14 13 Z" fill="${PAPER}" stroke="${LINE}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`,
      line(-21, 20, 16, -17, LINE, W_SHAPE)
    ],
  },
  {
    id: "ectopic-pregnancy", title: "Ectopic pregnancy (ECT)",
    engine: null, dsl: ["[ectopic]"],
    standard: "Bennett et al. 2008 Fig. 1.12; the slash restored by the 2025 Correction to Bennett et al. 2022 (J Genet Couns 34:e2020)",
    sourceUrl: "https://europepmc.org/articles/PMC11926493", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A small pregnancy-loss triangle carries a termination slash and ECT below it. The engine draws a slashed triangle with ECT below it.",
    draw: () => [
      line(0, -24, 0, -13),
      `<path d="M 0 -13 L 14 13 L -14 13 Z" fill="${PAPER}" stroke="${LINE}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`,
      line(-21, 20, 16, -17, LINE, W_SHAPE),
      `<text x="0" y="36" font-family="${FONT}" font-size="10.5" font-weight="400" fill="${TEXT}" text-anchor="middle">ECT</text>`,
    ],
  },
  {
    id: "adoption-brackets", title: "Adoption brackets",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 2.3b",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Brackets enclose the individual without touching its outline and mark adoption. The engine ignores adoption tokens and draws neither bracket.",
    draw: () => [
      square(0, 0),
      line(-24, -22, -24, 22),
      line(-24, -22, -20, -22),
      line(-24, 22, -20, 22),
      line(24, -22, 24, 22),
      line(20, -22, 24, -22),
      line(20, 22, 24, 22)
    ],
  },
  {
    id: "adoptive-descent-line", title: "Adoptive descent: dashed line",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 2.3b",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Dashed descent links an adoptive couple to a bracketed child, separating adoptive parentage from solid biological descent. Neither the dashed connection nor the brackets can be expressed by the engine.",
    draw: () => [
      line(-37, 0, 37, 0),
      square(-55, 0),
      circle(55, 0),
      `<g stroke-dasharray="5 4">`,
      line(0, 0, 0, 122),
      `</g>`,
      `<g transform="translate(0 140)">`,
      square(0, 0),
      line(-24, -22, -24, 22),
      line(-24, -22, -20, -22),
      line(-24, 22, -20, 22),
      line(24, -22, 24, 22),
      line(20, -22, 24, -22),
      line(20, 22, 24, 22),
      `</g>`
    ],
  },
  {
    id: "twin-fork", title: "Twin fork: common origin, unjoined branches",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2022 Fig. 3",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Two diagonal branches share one origin and remain unjoined, denoting dizygotic twins. The engine has no operative twin tokens and draws ordinary siblings.",
    draw: () => [
      line(0, -52, 0, -34),
      line(0, -34, -45, 0),
      line(0, -34, 45, 0),
      circle(-45, 18),
      circle(45, 18)
    ],
  },
  {
    id: "monozygosity-bar", title: "Monozygosity crossbar between twin branches",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 2.3a",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A short horizontal bar joins the twin branches above the symbols, marking monozygosity as in the exemplar. The engine omits both the common-origin fork and its crossbar.",
    draw: () => [
      line(0, -52, 0, -34),
      line(0, -34, -45, 0),
      line(0, -34, 45, 0),
      circle(-45, 18),
      circle(45, 18),
      line(-15.88, -22, 15.88, -22)
    ],
  },
  {
    id: "unknown-zygosity-marker", title: "Unknown-zygosity question mark between branches",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2022 Fig. 3",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A question mark between the common-origin branches records unknown zygosity. The engine cannot express this fork or its question mark.",
    draw: () => [
      line(0, -52, 0, -34),
      line(0, -34, -45, 0),
      line(0, -34, 45, 0),
      circle(-45, 18),
      circle(45, 18),
      `<text x="0" y="-5" font-family="${FONT}" font-size="13" font-weight="600" fill="${TEXT}" text-anchor="middle">?</text>`
    ],
  },
  {
    id: "no-children-bar", title: "No-children terminal bar",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 2.3a",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A single terminal bar ends a short descent from the couple to indicate no children. The documented token is ignored by the engine.",
    draw: () => [
      line(-37, 0, 37, 0),
      square(-55, 0),
      circle(55, 0),
      line(0, 0, 0, 40),
      line(-10, 40, 10, 40)
    ],
  },
  {
    id: "infertility-bars", title: "Infertility double terminal bar",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 2.3a",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Two terminal bars distinguish infertility from the single no-children bar. The engine ignores the documented infertility token.",
    draw: () => [
      line(-37, 0, 37, 0),
      square(-55, 0),
      circle(55, 0),
      line(0, 0, 0, 40),
      line(-10, 34.8, 10, 34.8),
      line(-10, 40, 10, 40)
    ],
  },
  {
    id: "evaluation-asterisk", title: "Verified-evaluation asterisk",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 4.1; 2022 Fig. 2",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 2, usageUsers: null,
    notes: "An asterisk outside the lower-right corner marks documented evaluation or records reviewed. The engine supplies no positioned asterisk and uses E for evaluated instead.",
    draw: () => [
      square(0, 0),
      `<text x="26" y="26" font-family="${FONT}" font-size="15" font-weight="600" fill="${TEXT}" text-anchor="middle">*</text>`
    ],
  },
  {
    id: "individual-annotation", title: "Below-symbol annotation: sex assigned at birth, clinical findings, dates or reproductive role",
    engine: null, dsl: ["[male, label: \"AFAB; 34y\"]", "[ectopic]"],
    standard: "2022 Box 1, Figs. 1, 4–5",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Birth-sex information and age sit beneath the gender shape in the exemplar caption size. These are plain annotations rather than extra person glyphs; the engine can place custom label text below a symbol.",
    draw: () => [
      square(0, 0),
      `<text x="0" y="34" font-family="${FONT}" font-size="10.5" font-weight="400" fill="${TEXT}" text-anchor="middle">AFAB</text>`,
      `<text x="0" y="50" font-family="${FONT}" font-size="10.5" font-weight="400" fill="${TEXT}" text-anchor="middle">34y</text>`
    ],
  },
  {
    id: "group-count", title: "Group count inside shape: number or `n`",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 1.3–4",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A number inside an unfilled shape groups that many relatives, while n leaves the count unspecified. Neither internal-count variant is available in the engine, and affected relatives should not be grouped.",
    draw: () => [
      square(-35, 0),
      `<text x="-35" y="4" font-family="${FONT}" font-size="12" font-weight="600" fill="${TEXT}" text-anchor="middle">3</text>`,
      square(35, 0),
      `<text x="35" y="4" font-family="${FONT}" font-size="12" font-weight="600" fill="${TEXT}" text-anchor="middle">n</text>`
    ],
  },
  {
    id: "unknown-family-history", title: "Unknown-family-history question mark on ancestry line",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 2.3a",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A question mark terminates the ancestry line above the individual to record unavailable family history. It is outside the shape, unlike a group count, and cannot be expressed by the engine.",
    draw: () => [
      line(0, -42, 0, -18),
      `<text x="0" y="-50" font-family="${FONT}" font-size="13" font-weight="600" fill="${TEXT}" text-anchor="middle">?</text>`,
      square(0, 0)
    ],
  },
  {
    id: "multiple-birth-fan", title: "Triplet/higher-multiple common-origin fan",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2022 Fig. 3",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Three unjoined branches fan from one origin for a trizygotic triplet birth. The same construction extends to higher multiples, which the engine also cannot express.",
    draw: () => [
      line(0, -52, 0, -34),
      line(0, -34, -60, 0),
      line(0, -34, 0, 0),
      line(0, -34, 60, 0),
      circle(-60, 18),
      circle(0, 18),
      circle(60, 18)
    ],
  },
  {
    id: "verified-zygosity-marker", title: "Proven-zygosity asterisk on multiple-birth connection",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 2.3a",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An asterisk beside the monozygosity connection records proven zygosity. Its position on the connection distinguishes it from an individual evaluation asterisk; neither is supported by the engine.",
    draw: () => [
      line(0, -52, 0, -34),
      line(0, -34, -45, 0),
      line(0, -34, 45, 0),
      circle(-45, 18),
      circle(45, 18),
      line(-15.88, -22, 15.88, -22),
      `<text x="0" y="-7" font-family="${FONT}" font-size="15" font-weight="600" fill="${TEXT}" text-anchor="middle">*</text>`
    ],
  },
  {
    id: "donor-connection", title: "Gamete donor (D)",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Bennett et al. 2022 Fig. 5 — D inside the donor's symbol, joined to the offspring by a line with no partnership line",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The donor's symbol carries D inside it and joins the child's descent line diagonally, with no partnership line to the parent, so donation is never read as a relationship. The engine requires a couple and cannot draw it.",
    draw: () => [
      square(-55, 0),
      `<text x="-55" y="4.5" font-family="${FONT}" font-size="13" font-weight="600" fill="${TEXT}" text-anchor="middle">D</text>`,
      circle(55, 0),
      line(-37, 18, 55, 60),
      line(55, 18, 55, 82),
      square(55, 100),
    ],
  },
  {
    id: "gestational-descent-line", title: "Gestational carrier (G)",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Bennett et al. 2022 Fig. 5, with the 2025 Correction (J Genet Couns 34:e2020) replacing S with G for a gestational carrier",
    sourceUrl: "https://europepmc.org/articles/PMC11926493", inExemplar: false, tier: 3, usageUsers: null,
    notes: "G inside the symbol of the person who carries the pregnancy without a genetic link, with the child drawn directly beneath her. The 2025 Correction retired S; a traditional surrogate, who also gives the egg, is drawn with D and the same direct descent. The engine requires children to belong to a couple and cannot express it.",
    draw: () => [
      circle(0, 0),
      `<text x="0" y="4.5" font-family="${FONT}" font-size="13" font-weight="600" fill="${TEXT}" text-anchor="middle">G</text>`,
      line(0, 18, 0, 82),
      square(0, 100),
    ],
  },
  {
    id: "relationship-annotation", title: "Relationship-line annotation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "2008 Fig. 2.2b",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: true, tier: 3, usageUsers: null,
    notes: "A caption above the double partnership line states the degree of relatedness, as in the exemplar. Relationship properties currently modify the second partner instead of attaching text to the union.",
    draw: () => [
      line(-37, -2.6, 37, -2.6),
      line(-37, 2.6, 37, 2.6),
      line(0, 2.6, 0, 30),
      square(-55, 0),
      circle(55, 0),
      `<text x="0" y="-25" font-family="${FONT}" font-size="10.5" font-weight="400" fill="${TEXT}" text-anchor="middle">first cousins</text>`
    ],
  },
  {
    id: "quadrant-top-left", title: "Top-left quadrant fill",
    engine: null, dsl: ["legend: t = \"Trait\" (fill: quad-tl)\np [affected: t]"],
    standard: "2008 Fig. 1.2: partitioning permitted; quadrant position has no fixed meaning",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The top left quarter is filled blue as a legend-defined segment; its location has no fixed clinical meaning. The engine accepts quad-tl but fills the whole node.",
    draw: () => [
      square(0, 0),
      `<rect x="-18" y="-18" width="18" height="18" fill="${BLUE}"/>`,
      square(0, 0, "none")
    ],
  },
  {
    id: "quadrant-top-right", title: "Top-right quadrant fill",
    engine: null, dsl: ["legend: t = \"Trait\" (fill: quad-tr)\np [affected: t]"],
    standard: "2008 Fig. 1.2: partitioning permitted",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The top right quarter is filled blue as a legend-defined segment; its location has no fixed clinical meaning. The engine accepts quad-tr but fills the whole node.",
    draw: () => [
      square(0, 0),
      `<rect x="0" y="-18" width="18" height="18" fill="${BLUE}"/>`,
      square(0, 0, "none")
    ],
  },
  {
    id: "quadrant-bottom-left", title: "Bottom-left quadrant fill",
    engine: null, dsl: ["legend: t = \"Trait\" (fill: quad-bl)\np [affected: t]"],
    standard: "2008 Fig. 1.2: partitioning permitted",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The bottom left quarter is filled blue as a legend-defined segment; its location has no fixed clinical meaning. The engine accepts quad-bl but fills the whole node.",
    draw: () => [
      square(0, 0),
      `<rect x="-18" y="0" width="18" height="18" fill="${BLUE}"/>`,
      square(0, 0, "none")
    ],
  },
  {
    id: "quadrant-bottom-right", title: "Bottom-right quadrant fill",
    engine: null, dsl: ["legend: t = \"Trait\" (fill: quad-br)\np [affected: t]"],
    standard: "2008 Fig. 1.2: partitioning permitted",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The bottom right quarter is filled blue as a legend-defined segment; its location has no fixed clinical meaning. The engine accepts quad-br but fills the whole node.",
    draw: () => [
      square(0, 0),
      `<rect x="0" y="0" width="18" height="18" fill="${BLUE}"/>`,
      square(0, 0, "none")
    ],
  },
  {
    id: "diagonal-hatch", title: "Diagonal hatch",
    engine: null, dsl: ["legend: t = \"Trait\" (fill: striped)\np [affected: t]"],
    standard: "2008 Fig. 1.2: legend-defined hatching; angle not prescribed",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Diagonal hatching provides another legend-defined clinical fill; the standard does not prescribe its angle. The engine accepts striped but draws a solid node.",
    draw: () => [
      square(0, 0),
      line(-18, -6, -6, -18),
      line(-18, 6, 6, -18),
      line(-18, 18, 18, -18),
      line(-6, 18, 18, -6),
      line(6, 18, 18, 6),
      square(0, 0, "none")
    ],
  },
  {
    id: "dotted-fill", title: "Dotted fill pattern",
    engine: null, dsl: ["legend: t = \"Trait\" (fill: dotted)\np [affected: t]"],
    standard: "2008 Fig. 1.2",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Repeated small slate dots form a legend-defined fill across the interior, distinct from the single large legacy carrier dot. The engine accepts dotted but draws a solid node.",
    draw: () => [
      square(0, 0),
      `<circle cx="-12" cy="-12" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="-4" cy="-12" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="4" cy="-12" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="12" cy="-12" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="-12" cy="-4" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="-4" cy="-4" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="4" cy="-4" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="12" cy="-4" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="-12" cy="4" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="-4" cy="4" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="4" cy="4" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="12" cy="4" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="-12" cy="12" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="-4" cy="12" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="4" cy="12" r="${W_LINE}" fill="${LINE}"/>`,
      `<circle cx="12" cy="12" r="${W_LINE}" fill="${LINE}"/>`,
      square(0, 0, "none")
    ],
  },
  {
    id: "legacy-evaluation-marker", title: "Evaluation E notation\u2014legacy",
    engine: null, dsl: ["[evaluated]"],
    standard: "2008 Fig. 4 instructions; removed by 2022 §4.2",
    sourceUrl: "https://doi.org/10.1007/s10897-008-9169-9", inExemplar: false, tier: 3, usageUsers: null,
    notes: "E+ below the individual illustrates the old positive evaluation-result notation, removed in the 2022 revision. The engine emits a bare E above the shape and cannot supply the legacy result notation.",
    draw: () => [
      square(0, 0),
      `<text x="0" y="34" font-family="${FONT}" font-size="10.5" font-weight="400" fill="${TEXT}" text-anchor="middle">E+</text>`
    ],
  },
  {
    id: "presymptomatic-carrier", title: "Asymptomatic or presymptomatic carrier",
    engine: null, dsl: ["[presymptomatic]"],
    standard: "Bennett et al. 2008 Fig. 4.3; Bennett et al. 2022 Fig. 2 — a vertical line through the unshaded symbol",
    sourceUrl: "https://doi.org/10.1002/jgc4.1621", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A vertical line from the top edge to the bottom edge of an unshaded symbol, for a person who carries a condition and may show it later. Half shading is not the standard mark. The engine draws the vertical line from the top edge to the bottom edge.",
    draw: () => [square(0, 0), line(0, -18, 0, 18, LINE, W_SHAPE)],
  },
];

await writeSet({
  type: "pedigree", exemplar: "pedigree",
  style: `Individuals are 36 x 36 squares and r = 18 circles outlined ${LINE} at 1.9 on white; lines are ${LINE} at 1.5 with round caps. Blue ${BLUE} is the only colour and means clinical status alone — the affected fill and the r = 4.6 carrier dot. The deceased slash runs lower-left to upper-right, 7 past the symbol, turning white inside a filled symbol. Pointers are slate arrows with filled heads. Lettering is Inter / Helvetica: 12 semibold ${TEXT} for individual numbers, 13 semibold for P, 10.5 #475569 for captions.`,
}, SYMBOLS);
