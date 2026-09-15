/** Draw visual-eval/symbols/genogram/ — the genogram symbols in the genogram exemplar's style.
 *
 *   node scripts/visual-eval/symbols/draw-genogram.mjs
 *
 * Constants are lifted from visual-eval/exemplars/genogram/ideal.svg (1 unit = 1 exemplar px):
 * 48 x 48 squares and r = 24 circles outlined #1F2937 at 2, the sex fills #DBEAFE (male) and
 * #FCE7F3 (female), structural lines at 1.8 with butt caps, emotional lines at 1.7–2, and red
 * #B91C1C reserved for the negative emotional lines. Symbols the exemplar does not contain are
 * built from the same parts.
 *
 * Library-wide rules:
 * - The shape says sex, an overlay says status, a fill says condition, a line form says the
 *   relationship. No symbol uses two of those channels for one meaning.
 * - Emotional relationships are told apart by line form; red only reinforces the negative ones,
 *   so a black-and-white photocopy loses nothing.
 * - Individual symbols are drawn alone; relationship symbols are drawn as a 120-unit sample
 *   between two small partner shapes, as in the exemplar's legend, so their form reads in context.
 */
import { n2, writeSet } from "./lib.mjs";

const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const INK = "#1F2937", SLATE = "#64748B", RED = "#B91C1C", TEAL = "#0D9488";
const MALE = "#DBEAFE", FEMALE = "#FCE7F3";
// The tint is reserved for legend-defined fills; MFI condition regions use INK.
// Condition fills: the position carries the McGoldrick meaning, the tint names the category as the
// exemplar does. Fills McGoldrick does not define are neutral, so they never pass for a standard one.
const ILLNESS = "#A5B4FC", SUBSTANCE = "#FCD34D", LEGEND = "#CBD5E1";
const W_SHAPE = 2, W_LINE = 1.8, W_EMO = 1.7;
const HALF = 24;

const square = (x, y, fill = MALE, half = HALF) =>
  `<rect x="${n2(x - half)}" y="${n2(y - half)}" width="${2 * half}" height="${2 * half}" fill="${fill}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`;
const circle = (x, y, fill = FEMALE, r = HALF) =>
  `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`;
const line = (x1, y1, x2, y2, color = INK, width = W_LINE) =>
  `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="butt"/>`;
/** Two partner shapes 180 apart with the relationship drawn between them, as on a couple line. */
const couple = (between) => [
  line(-66, 0, 66, 0, INK, W_LINE),
  ...between,
  square(-90, 0),
  circle(90, 0),
];

// Seed round: five symbols copied from the exemplar, one built from its parts.
const SYMBOLS = [
  {
    id: "male", title: "Male",
    engine: null, dsl: ["[male]", "[M]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a 48 x 48 square outlined at 2 with the pale blue sex fill. Age, when known, is written inside in 14 semibold.",
    draw: () => [square(0, 0)],
  },
  {
    id: "female", title: "Female",
    engine: null, dsl: ["[female]", "[F]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: an r = 24 circle outlined at 2 with the pale pink sex fill, the same height as the male square so a generation lines up on one baseline.",
    draw: () => [circle(0, 0)],
  },
  {
    id: "unknown-gender", title: "Unknown gender",
    engine: null, dsl: ["[unknown]", "[other]"],
    standard: "GenoPro genogram symbols — question mark for unknown gender, diamond for a pet",
    sourceUrl: "https://genopro.com/genogram/symbols/", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A question mark occupies the person's 48-unit symbol box, using the set's Inter lettering and ink. The engine uses this for unknown or other sex unless a shape is explicitly specified. A diamond with a question mark remains the separate unknown-siblings placeholder.",
    draw: () => [`<text x="0" y="${HALF * 0.95}" font-family="${FONT}" font-size="${HALF * 2.7}" font-weight="400" fill="${INK}" text-anchor="middle">?</text>`],
  },
  {
    id: "deceased-male", title: "Deceased (male)",
    engine: null, dsl: ["[male, deceased]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a cross drawn corner to corner at the shape weight, ending exactly on the corners. Genograms use an X; the single slash belongs to pedigrees, and the two must not be mixed.",
    draw: () => [square(0, 0), line(-24, -24, 24, 24, INK, W_SHAPE), line(24, -24, -24, 24, INK, W_SHAPE)],
  },
  {
    id: "index-person", title: "Index person (identified patient)",
    engine: null, dsl: ["[index]", "[female, index]"],
    standard: "Accepted exemplar: index-person double outline; not shown in the supplied MFI pp. 14–15",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a second outline 4 units outside the shape in teal at 1.8, the only teal on a genogram. The engine uses a gold border; teal matches the exemplar the owner reviewed.",
    draw: () => [circle(0, 0), `<circle cx="0" cy="0" r="28" fill="none" stroke="${TEAL}" stroke-width="${W_LINE}"/>`],
  },
  {
    id: "divorced", title: "Divorce",
    engine: null, dsl: ["A -divorced- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: two parallel slashes at 2 crossing the 1.8 couple line at its midpoint, 16 apart, leaning the same way. One slash would mean separation.",
    draw: () => couple([line(-15, 9, -1, -9, INK, W_SHAPE), line(1, 9, 15, -9, INK, W_SHAPE)]),
  },
  {
    id: "conflict", title: "Conflict (emotional relationship)",
    engine: null, dsl: ["A -conflict- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "The exemplar's red zigzag at 2, drawn here between two partner shapes: 8-unit teeth, 16-unit pitch, starting and ending on the axis so it meets each shape cleanly. Red reinforces a negative relationship; the zigzag alone still says conflict.",
    draw: () => {
      const pts = [];
      for (let x = -66, i = 0; x <= 66; x += 11, i++) pts.push(`${x},${i === 0 || x + 11 > 66 ? 0 : i % 2 ? -7 : 7}`);
      return [square(-90, 0), circle(90, 0), `<polyline points="${pts.join(" ")}" fill="none" stroke="${RED}" stroke-width="2" stroke-linejoin="round"/>`];
    },
  },
  {
    id: "pet", title: "Pet",
    engine: null, dsl: ["[shape: diamond] (shape only; no pet semantics)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15; GenoPro genogram symbols — a diamond is a pet",
    sourceUrl: "https://genopro.com/genogram/symbols/", inExemplar: false, tier: 2, usageUsers: null,
    notes: "In a family-therapy genogram a diamond denotes a household pet in both the MFI handout and GenoPro. The engine draws a question mark for [unknown] and [other] unless a shape is explicit. Explicit [shape: diamond], nonbinary/intersex and the unknown-siblings placeholder use a diamond. This library draws the pet smaller than a person; the engine has no dedicated pet kind.",
    draw: () => [`<path d="M 0 -17 L 17 0 L 0 17 L -17 0 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="${W_SHAPE}"/>`],
  },
  {
    id: "marriage-line", title: "Marriage / ordinary connection",
    engine: null, dsl: ["A -- B", "A -normal- B", "A -harmony- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: true, tier: 1, usageUsers: null,
    notes: "A single structural line joins partners in the library horizontal sample. MFI marriage uses a solid couple connection with marriage dates. Normal and harmony are single emotional lines in GenoPro; friendship/close uses two lines and is listed under close-double-line.",
    draw: () => couple([]),
  },
  {
    id: "biological-descent-line", title: "Biological descent",
    engine: null, dsl: ["A -- B\n  child [male]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: true, tier: 1, usageUsers: null,
    notes: "A solid drop runs from the midpoint of the couple line to the child at the next generation. Its uninterrupted form identifies biological descent.",
    draw: () => [...couple([]), line(0, 0, 0, 72), square(0, 96)],
  },
  {
    id: "sibship-bar", title: "Sibship",
    engine: null, dsl: ["A -- B\n  child1 [male]\n  child2 [female]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: true, tier: 1, usageUsers: null,
    notes: "The parent drop meets a horizontal sibship bar, with separate vertical drops to siblings on one baseline. This distinguishes siblings from the diagonal fan of a multiple birth.",
    draw: () => [...couple([]), line(0, 0, 0, 48), line(-48, 48, 48, 48), line(-48, 48, -48, 96), line(48, 48, 48, 96), square(-48, 120), circle(48, 120)],
  },
  {
    id: "separation-slash", title: "Separation",
    engine: null, dsl: ["A -/- B", "A -// B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 1, usageUsers: null,
    notes: "One diagonal slash crosses the marriage line at its midpoint. The single slash distinguishes separation from the accepted divorce seed with two slashes.",
    draw: () => couple([line(-7, 9, 7, -9, INK, W_SHAPE)]),
  },
  {
    id: "household-enclosure", title: "Shared household",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15; continuation p. 16 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: true, tier: 1, usageUsers: null,
    notes: "A closed dashed enclosure surrounds the people sharing a home, independently of their kinship. Its slate outline, 10-unit corner radius and 7–5 dash cadence follow the exemplar, using the existing structural weight; the engine has no household boundary DSL. The household/placement example appears on continuation p. 16, beyond the attached pp. 14–15.",
    draw: () => [...couple([]), `<text x="-80" y="-50" font-family="${FONT}" font-size="11.5" font-weight="400" fill="${SLATE}" text-anchor="middle">Household</text>`, `<rect x="-120" y="-38" width="240" height="76" rx="10" fill="none" stroke="${SLATE}" stroke-width="${W_LINE}" stroke-dasharray="7 5"/>`],
  },
  {
    id: "cohabitation-line", title: "Cohabitation",
    engine: null, dsl: ["A ~ B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI uses a dashed couple relationship line, labelled with relationship and living-together dates when known. The sample retains the library horizontal relationship layout.",
    draw: () => [`<path d="M -66 0 L 66 0" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" stroke-dasharray="6 4"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "cohabitation-ended-line", title: "Ended cohabitation",
    engine: null, dsl: ["A ~/~ B"],
    standard: "Local library extension; not established by the supplied MFI or GenoPro sources",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "A single separation slash crosses a dashed partnership line. Retaining the dashes indicates that the ended union was unmarried.",
    draw: () => [`<path d="M -66 0 L 66 0" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" stroke-dasharray="6 4"/>`, line(-7, 9, 7, -9, INK, W_SHAPE), square(-90, 0), circle(90, 0)],
  },
  {
    id: "adoptive-descent-line", title: "Adoptive descent",
    engine: null, dsl: ["A -- B\n  child [adopted]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Source conflict: MFI draws a solid descent plus a parallel dashed line labelled A and the adoption date. GenoPro uses a dashed descent (https://genopro.com/genogram/symbols/). This sample follows MFI; the engine lacks the parallel dashed adoption mark.",
    draw: () => [...couple([]), line(0, 0, 0, 72), `<path d="M 8 0 V 72" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" stroke-dasharray="6 4"/>`, `<text x="17" y="40" font-family="${FONT}" font-size="11.5" fill="${SLATE}">A ’97</text>`, square(0, 96)],
  },
  {
    id: "adoption-brackets", title: "Adoption brackets",
    engine: null, dsl: ["A -- B\n  child [adopted]"],
    standard: "Bennett 2022, pedigree nomenclature borrowed for genograms — https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Brackets outside the person are borrowed from Bennett pedigree nomenclature, not the MFI adoption convention. MFI instead uses a solid descent plus a parallel dashed line labelled A. The engine accepts adopted but omits the brackets.",
    draw: () => [square(0, 0), `<path d="M -30 -28 H -36 V 28 H -30 M 30 -28 H 36 V 28 H 30" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" />`],
  },
  {
    id: "foster-descent-line", title: "Foster / guardian descent",
    engine: null, dsl: ["A -- B\n  child [foster]", "A -- B\n  child [guardian]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Source conflict: MFI uses dashed descent labelled with the dates the child lived with the family (LW 98–99). GenoPro uses a dotted line (https://genopro.com/genogram/symbols/). This sample follows MFI; the engine does not style primary foster links correctly.",
    draw: () => [...couple([]), `<path d="M 0 0 V 72" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" stroke-dasharray="6 4"/>`, `<text x="10" y="40" font-family="${FONT}" font-size="11.5" fill="${SLATE}">LW 98–99</text>`, square(0, 96)],
  },
  {
    id: "twin-fan", title: "Fraternal twins",
    engine: null, dsl: ["A -- B\n  child1 [twin-fraternal]\n  child2 [twin-fraternal]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Two diagonal child branches share one origin, identifying a twin birth. No joining bar is present; both children must share a birth year or omit it in the engine.",
    draw: () => [...couple([]), line(0, 0, 0, 36), line(0, 36, -48, 96), line(0, 36, 48, 96), square(-48, 120), circle(48, 120)],
  },
  {
    id: "identical-twin-bar", title: "Identical twins",
    engine: null, dsl: ["A -- B\n  child1 [twin-identical]\n  child2 [twin-identical]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A horizontal bar joins the two branches of the twin fan. That extra link indicates identical twins rather than fraternal twins.",
    draw: () => [...couple([]), line(0, 0, 0, 36), line(0, 36, -48, 96), line(0, 36, 48, 96), line(-24, 66, 24, 66), square(-48, 120), square(48, 120)],
  },
  {
    id: "pregnancy-triangle", title: "Current pregnancy",
    engine: null, dsl: ["[pregnancy]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A small hollow triangle with a solid outline denotes pregnancy. The engine draws this form.",
    draw: () => [`<path d="M 0 -12 L 12 10 L -12 10 Z" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}" stroke-linecap="butt" />`],
  },
  {
    id: "miscarriage-circle", title: "Miscarriage",
    engine: null, dsl: ["[miscarriage]", "[miscarried]", "[miscarry]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI draws a small hollow circle at the end of a short descent line for miscarriage. GenoPro uses a crossed triangle; this library follows MFI. The engine draws this form.",
    draw: () => [line(0, -24, 0, -4), circle(0, 0, "none", 4)],
  },
  {
    id: "induced-abortion-cross", title: "Induced abortion",
    engine: null, dsl: ["[abortion]", "[aborted]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI uses a small X for induced abortion; its miscarriage marker is a hollow circle. GenoPro uses a crossed triangle with an additional bar, so the MFI form takes precedence. The engine draws this form.",
    draw: () => [line(-6, -6, 6, 6, INK, W_SHAPE), line(6, -6, -6, 6, INK, W_SHAPE)],
  },
  {
    id: "stillbirth-symbol", title: "Stillbirth",
    engine: null, dsl: ["[stillborn]", "[stillbirth]", "[stillbirths]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI uses a small square with an X for stillbirth; only the birth/death dates are written above it. There is no SB label. The engine draws this form.",
    draw: () => [square(0, 0, MALE, 12), line(-12, -12, 12, 12, INK, W_SHAPE), line(12, -12, -12, 12, INK, W_SHAPE)],
  },
  {
    id: "close-double-line", title: "Close relationship",
    engine: null, dsl: ["A -close- B", "A -friendship- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Two parallel emotional lines are 12 units apart, matching the exemplar. Their multiplicity denotes closeness without relying on a positive color.",
    draw: () => [line(-66, -6, 67, -6, INK, W_EMO), line(-66, 6, 67, 6, INK, W_EMO), square(-90, 0), circle(90, 0)],
  },
  {
    id: "fused-triple-line", title: "Fused relationship",
    engine: null, dsl: ["A -fused- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Three parallel lines denote fusion in MFI. Best friends is a separate GenoPro form with two lines and short cross ticks; it is not an alias for fusion.",
    draw: () => [line(-66, -6, 67, -6, INK, W_EMO), line(-66, 0, 66, 0, INK, W_EMO), line(-66, 6, 67, 6, INK, W_EMO), square(-90, 0), circle(90, 0)],
  },
  {
    id: "distant-dashed-line", title: "Distant relationship",
    engine: null, dsl: ["A -distant- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI Distant uses short dashes between people, not sparse dots. This emotional line is distinct in context from the structural dashed couple line.",
    draw: () => [`<path d="M -66 0 L 66 0" fill="none" stroke="${INK}" stroke-width="${W_EMO}" stroke-linecap="butt" stroke-dasharray="5 5"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "cutoff-break", title: "Emotional cutoff",
    engine: null, dsl: ["A -cutoff- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A gap interrupts the emotional line, with a short perpendicular bar at each broken end. This copies the exemplar and remains distinct from mere distance in monochrome.",
    draw: () => [line(-66, 0, -12, 0, RED, W_SHAPE), line(12, 0, 66, 0, RED, W_SHAPE), line(-12, -9, -12, 9, RED, W_SHAPE), line(12, -9, 12, 9, RED, W_SHAPE), square(-90, 0), circle(90, 0)],
  },
  {
    id: "close-hostile-line", title: "Close and hostile",
    engine: null, dsl: ["A -close-hostile- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A zigzag lies between two parallel closeness lines, retaining both meanings in one relationship. The engine draws this form.",
    draw: () => [line(-66, -9, 68, -9, INK, W_EMO), line(-66, 9, 68, 9, INK, W_EMO), `<polyline points="-66,0 -55,-7 -44,7 -33,-7 -22,7 -11,-7 0,7 11,-7 22,7 33,-7 44,7 55,-7 66,0" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "fused-hostile-line", title: "Fused and hostile",
    engine: null, dsl: ["A -fused-hostile- B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A zigzag crosses three parallel fusion lines, preserving the distinction from close-hostile. The engine draws this form.",
    draw: () => [line(-66, -9, 68, -9, INK, W_EMO), line(-66, 0, 66, 0, INK, W_EMO), line(-66, 9, 68, 9, INK, W_EMO), `<polyline points="-66,0 -55,-7 -44,7 -33,-7 -22,7 -11,-7 0,7 11,-7 22,7 33,-7 44,7 55,-7 66,0" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "physical-abuse-line", title: "Physical abuse",
    engine: null, dsl: ["A -physical-abuse-> B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI physical abuse is a zigzag ending in a filled arrowhead toward the affected person. GenoPro depicts physical abuse differently; MFI takes precedence. Jealous is a separate GenoPro arrow with a hollow midpoint diamond.",
    draw: () => [`<polyline points="-66.0,0 -55.75,-7 -45.5,7 -35.25,-7 -25.0,7 -14.75,-7 -4.5,7 5.75,-7 16.0,7 26.25,-7 36.5,7 46.75,-7 57.0,0" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`, line(57, 0, 66, 0, RED, W_SHAPE), `<path d="M 57 -5 L 66 0 L 57 5 Z" fill="${RED}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "emotional-abuse-line", title: "Emotional abuse",
    engine: null, dsl: ["A -emotional-abuse-> B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI emotional abuse is a zigzag ending at the base of a hollow triangular arrowhead. There is no wave. GenoPro uses a different form; this library follows MFI.",
    draw: () => [`<polyline points="-66,0 -55.75,-7 -45.5,7 -35.25,-7 -25,7 -14.75,-7 -4.5,7 5.75,-7 16,7 26.25,-7 36.5,7 46.75,-7 57,0" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`, `<path d="M 57 -7 L 66 0 L 57 7 Z" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "sexual-abuse-line", title: "Sexual abuse",
    engine: null, dsl: ["A -sexual-abuse-> B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI sexual abuse is a zigzag enclosed by two parallel lines, ending in a filled arrowhead. There is no identification dot. GenoPro uses a different form; MFI takes precedence.",
    draw: () => [line(-66, -7, 57, -7, RED, W_EMO), line(-66, 7, 57, 7, RED, W_EMO), `<polyline points="-66,0 -55.75,-7 -45.5,7 -35.25,-7 -25,7 -14.75,-7 -4.5,7 5.75,-7 16,7 26.25,-7 36.5,7 46.75,-7 57,0" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`, `<path d="M 57 -7 L 66 0 L 57 7 Z" fill="${RED}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "condition-full-fill", title: "Full condition fill",
    engine: null, dsl: ["[conditions: name(full, #FCD34D)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Whole-person tint is legend-defined; not an MFI convention. The chart legend must state its meaning.",
    draw: () => [square(0, 0), `<rect x="-24" y="-24" width="48" height="48" fill="${LEGEND}"/>`, square(0, 0, "none")],
  },
  {
    id: "condition-half-left", title: "Physical or psychological illness",
    engine: null, dsl: ["[conditions: name(half-left, #1F2937)]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Left-half black ink means physical or psychological illness. This is a specific MFI convention, not a freely assigned condition position.",
    draw: () => [square(0, 0), `<rect x="-24" y="-24" width="24" height="48" fill="${ILLNESS}"/>`, square(0, 0, "none")],
  },
  {
    id: "condition-half-right", title: "Right half condition fill",
    engine: null, dsl: ["[conditions: name(half-right, #FCD34D)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Right-half tint is legend-defined; not an MFI convention. The chart legend must state its meaning.",
    draw: () => [square(0, 0), `<rect x="0" y="-24" width="24" height="48" fill="${LEGEND}"/>`, square(0, 0, "none")],
  },
  {
    id: "consanguinity-double-line", title: "Consanguineous partnership",
    engine: null, dsl: ["A == B"],
    standard: "Bennett 2022, pedigree nomenclature borrowed for genograms — https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two closely spaced partnership lines are borrowed from Bennett pedigree nomenclature. Their 4-unit spacing distinguishes the partnership from the 12-unit emotional close relationship; the engine chart uses one line.",
    draw: () => [line(-66, -2, 66.1, -2), line(-66, 2, 66.1, 2), square(-90, 0), circle(90, 0)],
  },
  {
    id: "engagement-diamond", title: "Engagement",
    engine: null, dsl: ["A -o- B"],
    standard: "Local library extension; not established by the supplied MFI or GenoPro sources",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "An open midpoint diamond marks engagement in the local extension. The line stops at the diamond edges so the mark remains hollow; the engine draws the line without the diamond.",
    draw: () => [line(-66, 0, -8, 0), line(8, 0, 66, 0), `<path d="M 0 -8 L 8 0 L 0 8 L -8 0 Z" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" />`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "multiple-birth-fan", title: "Triplets / multiple birth",
    engine: null, dsl: ["A -- B\n  child1 [twin-fraternal]\n  child2 [twin-fraternal]\n  child3 [twin-fraternal]"],
    standard: "Local library extension; not established by the supplied MFI or GenoPro sources",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Three diagonal or vertical branches share a single birth origin, extending the twin fan to triplets. The engine groups three or more twin-marked children; triplet attributes themselves are not accepted.",
    draw: () => [...couple([]), line(0, 0, 0, 36), line(0, 36, -72, 96), line(0, 36, 0, 96), line(0, 36, 72, 96), square(-72, 120), circle(0, 120), square(72, 120)],
  },
  {
    id: "unknown-zygosity-mark", title: "Twins, zygosity unknown",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Bennett 2022, pedigree nomenclature borrowed for genograms — https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The question mark between twin branches is borrowed from Bennett pedigree nomenclature and leaves zygosity unknown. MFI pp. 14–15 show twins and identical twins, not this marker; the parser has no twin-unknown entry.",
    draw: () => [...couple([]), line(0, 0, 0, 36), line(0, 36, -48, 96), line(0, 36, 48, 96), `<text x="0" y="71" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}" text-anchor="middle">?</text>`, square(-48, 120), square(48, 120)],
  },
  {
    id: "no-children-terminal", title: "No children",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Bennett 2022, pedigree nomenclature borrowed for genograms — https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Borrowed from Bennett pedigree nomenclature, not an MFI convention. A short descent from the union terminates in one horizontal bar, indicating no children. The genogram parser does not accept the shared no-children marker.",
    draw: () => [...couple([]), line(0, 0, 0, 48), line(-10, 48, 10, 48)],
  },
  {
    id: "infertility-terminal", title: "Infertility",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Bennett 2022, pedigree nomenclature borrowed for genograms — https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Borrowed from Bennett pedigree nomenclature, not an MFI convention. Two terminal bars on a short descent distinguish infertility from the single bar for no children. The genogram parser has no infertile marker entry.",
    draw: () => [...couple([]), line(0, 0, 0, 48), line(-10, 42, 10, 42), line(-10, 48, 10, 48)],
  },
  {
    id: "placement-transfer-arrow", title: "Placement into a family",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15; continuation p. 16 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An arrow from the child turns upward toward the receiving couple, identifying the family into which the child moved. This follows the placement-direction convention rather than indicating biological descent; the engine has no placement arrow DSL. The household/placement example appears on continuation p. 16, beyond the attached pp. 14–15.",
    draw: () => [...couple([]), square(-48, 108), `<path d="M -48 84 V 56 Q -48 48 -40 48 H -8 Q 0 48 0 40 V 10" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" />`, `<path d="M -5 19 L 0 10 L 5 19" fill="none" stroke="${INK}" stroke-width="${W_LINE}"/>`],
  },
  {
    id: "donor-descent-line", title: "Donor / surrogate connection",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Bennett 2022, pedigree nomenclature borrowed for genograms — https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621",
    sourceUrl: "https://onlinelibrary.wiley.com/doi/10.1002/jgc4.1621", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Donor D and surrogate S role letters are borrowed from Bennett pedigree nomenclature, not MFI symbols. MFI labels sperm donor, egg donor and surrogate mother in words. This letter-labelled contributor sample requires an explicit pedigree legend; neither role has accepted genogram DSL.",
    draw: () => [square(0, -48), `<path d="M 0 -24 L 0 48" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" stroke-dasharray="2 4"/>`, `<text x="16" y="16" font-family="${FONT}" font-size="11.5" font-weight="400" fill="${SLATE}" text-anchor="middle">D</text>`, circle(0, 72)],
  },
  {
    id: "repaired-cutoff-mark", title: "Repaired cutoff",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A small open circle straddles the two cutoff bars on a reconnected line, as in the handout. The engine cannot express the repaired relationship.",
    draw: () => [line(-66, 0, -9, 0), line(9, 0, 66, 0), line(-5, -12, -5, -7.5), line(-5, 7.5, -5, 12), line(5, -12, 5, -7.5), line(5, 7.5, 5, 12), circle(0, 0, "none", 9), square(-90, 0), circle(90, 0)],
  },
  {
    id: "caretaker-relationship-mark", title: "Caretaker relationship",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two open chevrons terminate a directional line toward the person receiving care, as in the handout. The double open head distinguishes caretaking from the filled emotional arrow; the engine lacks this relationship.",
    draw: () => [line(-66, 0, 63, 0), `<path d="M 49 -6 L 56 0 L 49 6 M 58 -6 L 65 0 L 58 6" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" />`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "spiritual-connection-line", title: "Spiritual connection",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two intertwined waves run out of phase and cross one another for the MFI spiritual connection. The existing ink and emotional stroke weight preserve the library palette; the engine has no corresponding type.",
    draw: () => {
      const waves = [];
      for (const phase of [1, -1]) {
        let d = "M -66 0";
        for (let i = 0; i < 8; i++) {
          const x = -66 + i * 16.5, bend = (i % 2 ? -1 : 1) * phase * 9;
          d += ` C ${n2(x + 5.5)} ${bend} ${n2(x + 11)} ${bend} ${n2(x + 16.5)} 0`;
        }
        waves.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${W_EMO}"/>`);
      }
      return [...waves, square(-90, 0), circle(90, 0)];
    },
  },
  {
    id: "family-secret-mark", title: "Family secret",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A small solid upright triangle is the standalone secret marker shown in the handout. Its filled interior distinguishes it from the hollow pregnancy triangle; the engine has no independent adornment entry.",
    draw: () => [`<path d="M 0 -8 L 8 7 L -8 7 Z" fill="${INK}"/>`],
  },
  {
    id: "immigration-mark", title: "Immigration adornment",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two short waves cross a stem above the person, matching MFI. This mark has no arrowhead; the engine cannot draw it.",
    draw: () => [square(0, 18), line(0, -6, 0, -38), `<path d="M -13 -31 C -13 -21 -3 -21 0 -29 S 10 -36 13 -28 M -13 -25 C -13 -15 -3 -15 0 -23 S 10 -30 13 -22" fill="none" stroke="${INK}" stroke-width="${W_EMO}" stroke-linecap="butt" />`],
  },
  {
    id: "gay-lesbian-overlay", title: "Gay / lesbian orientation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An open inverted triangle inside the person is the orientation overlay in the 2017 handout. It does not replace the gender shape or imply a condition fill; the engine has no orientation overlay entry.",
    draw: () => [square(0, 0), `<path d="M -13 -10 H 13 L 0 15 Z" fill="none" stroke="${INK}" stroke-width="${W_EMO}" stroke-linecap="butt" />`],
  },
  {
    id: "bisexual-overlay", title: "Bisexual orientation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A dotted inverted triangle inside the person denotes bisexual orientation in the 2017 handout. Its broken outline differs from the solid gay/lesbian overlay; the engine cannot express it.",
    draw: () => [square(0, 0), `<path d="M -13 -10 H 13 L 0 15 Z" fill="none" stroke="${INK}" stroke-width="${W_EMO}" stroke-linecap="butt" stroke-dasharray="2 3"/>`],
  },
  {
    id: "clinical-letter-marker", title: "Clinical letter marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An S beside the lower edge of the person represents the handout's clinical letter marker, with O and L merged as text-only variants. The inspected handout places the letter beside the outline rather than inside as drafted; the engine has no dedicated clinical marker.",
    draw: () => [square(0, 0), `<text x="33" y="24" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}" text-anchor="middle">S</text>`],
  },
  {
    id: "age-at-death-box", title: "Boxed age at death",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The age box sits at the centre of the deceased person. All four X arms stop at its edges, leaving 59 legible inside; birth/death dates belong above the person. The engine only displays an unboxed age.",
    draw: () => [square(0, 0), line(-24, -24, -13, -13, INK, W_SHAPE), line(24, -24, 13, -13, INK, W_SHAPE), line(-24, 24, -13, 13, INK, W_SHAPE), line(24, 24, 13, 13, INK, W_SHAPE), `<rect x="-13" y="-13" width="26" height="26" fill="none" stroke="${INK}" stroke-width="${W_LINE}"/>`, `<text x="0" y="5" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}" text-anchor="middle">59</text>`],
  },
  {
    id: "remission-recovery-fill", title: "Physical or psychological illness in remission",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "MFI illness in remission: black lower-left quarter, a full vertical diameter, and a horizontal radius to the left only. No horizontal divider crosses the unfilled right half.",
    draw: () => [circle(0, 0), `<path d="M 0 0 L -24 0 A 24 24 0 0 0 0 24 Z" fill="${ILLNESS}"/>`, line(0, -24, 0, 24), line(-24, 0, 0, 0), circle(0, 0, "none")],
  },
  {
    id: "suspected-addiction-fill", title: "Suspected alcohol or drug abuse",
    engine: null, dsl: ["— (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "MFI bottom-half black hatching means suspected alcohol or drug abuse. The top half remains unfilled. The engine supports whole-person stripes but lacks this partial texture.",
    draw: () => {
      const stripes = [];
      for (let x = -48; x <= 24; x += 6) stripes.push(line(x, 24, x + 24, 0, INK, W_EMO));
      return [square(0, 0, "none"), `<defs><clipPath id="suspected-addiction-half"><rect x="-24" y="0" width="48" height="24"/></clipPath></defs>`, `<g clip-path="url(#suspected-addiction-half)">${stripes.join("")}</g>`, line(-24, 0, 24, 0), square(0, 0, "none")];
    },
  },
  {
    id: "condition-half-top", title: "Upper half condition fill",
    engine: null, dsl: ["[conditions: name(half-top, #FCD34D)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Upper-half tint is legend-defined; not an MFI convention. The chart legend must state its meaning.",
    draw: () => [square(0, 0), `<rect x="-24" y="-24" width="48" height="24" fill="${LEGEND}"/>`, square(0, 0, "none")],
  },
  {
    id: "condition-half-bottom", title: "Alcohol or drug abuse",
    engine: null, dsl: ["[conditions: name(half-bottom, #1F2937)]"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Bottom-half black ink means alcohol or drug abuse. This is a specific MFI convention, not a freely assigned condition position.",
    draw: () => [square(0, 0), `<rect x="-24" y="0" width="48" height="24" fill="${SUBSTANCE}"/>`, square(0, 0, "none")],
  },
  {
    id: "condition-quarter-top-left", title: "Upper left quarter fill",
    engine: null, dsl: ["[conditions: name(quad-tl, #FCD34D)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Upper-left quarter tint is legend-defined; not an MFI convention. The chart legend must state its meaning.",
    draw: () => [square(0, 0), `<rect x="-24" y="-24" width="24" height="24" fill="${LEGEND}"/>`, square(0, 0, "none")],
  },
  {
    id: "condition-quarter-top-right", title: "Upper right quarter fill",
    engine: null, dsl: ["[conditions: name(quad-tr, #FCD34D)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Upper-right quarter tint is legend-defined; not an MFI convention. The chart legend must state its meaning.",
    draw: () => [square(0, 0), `<rect x="0" y="-24" width="24" height="24" fill="${LEGEND}"/>`, square(0, 0, "none")],
  },
  {
    id: "condition-quarter-bottom-left", title: "Lower left quarter fill",
    engine: null, dsl: ["[conditions: name(quad-bl, #FCD34D)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Lower-left quarter tint is legend-defined; not an MFI convention. The chart legend must state its meaning. A generic quarter without the MFI dividing lines does not express remission or recovery.",
    draw: () => [square(0, 0), `<rect x="-24" y="0" width="24" height="24" fill="${LEGEND}"/>`, square(0, 0, "none")],
  },
  {
    id: "condition-quarter-bottom-right", title: "Lower right quarter fill",
    engine: null, dsl: ["[conditions: name(quad-br, #FCD34D)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Lower-right quarter tint is legend-defined; not an MFI convention. The chart legend must state its meaning.",
    draw: () => [square(0, 0), `<rect x="0" y="0" width="24" height="24" fill="${LEGEND}"/>`, square(0, 0, "none")],
  },
  {
    id: "condition-hatched-fill", title: "Whole-person hatching",
    engine: null, dsl: ["[conditions: name(striped)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Whole-person hatching is legend-defined; not an MFI convention. The chart legend must state its meaning. MFI suspected alcohol or drug abuse instead hatches only the bottom half.",
    draw: () => {
      const stripes = [];
      for (let x = -72; x <= 24; x += 6) stripes.push(line(x, 24, x + 48, -24, INK, W_EMO));
      return [`<defs><clipPath id="condition-hatched-person"><rect x="-24" y="-24" width="48" height="48"/></clipPath></defs>`, `<g clip-path="url(#condition-hatched-person)">${stripes.join("")}</g>`, square(0, 0, "none")];
    },
  },
  {
    id: "condition-dotted-fill", title: "Whole-person stippling",
    engine: null, dsl: ["[conditions: name(dotted)]"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Whole-person stippling is legend-defined; not an MFI convention. The chart legend must state its meaning.",
    draw: () => {
      const dots = [];
      for (let y = -20; y <= 20; y += 8) for (let x = -20; x <= 20; x += 8) dots.push(`<circle cx="${x}" cy="${y}" r="1" fill="${INK}"/>`);
      return [...dots, square(0, 0, "none")];
    },
  },
  {
    id: "condition-radial-sectors", title: "Five condition sectors",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Local condition legend; not an MFI convention",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Five radial sectors is legend-defined; not an MFI convention. The chart legend must state its meaning.",
    draw: () => {
      const sectors = [];
      const fills = [LEGEND, "none", SLATE, LEGEND, "none"];
      for (let i = 0; i < 5; i++) {
        const a = (-90 + i * 72) * Math.PI / 180, b = a + 72 * Math.PI / 180;
        sectors.push(`<path d="M 0 0 L ${n2(24 * Math.cos(a))} ${n2(24 * Math.sin(a))} A 24 24 0 0 1 ${n2(24 * Math.cos(b))} ${n2(24 * Math.sin(b))} Z" fill="${fills[i]}" stroke="${INK}" stroke-width="${W_LINE}"/>`);
      }
      return [...sectors, circle(0, 0, "none")];
    },
  },
  {
    id: "external-person-outline", title: "External person",
    engine: null, dsl: ["[external: true]"],
    standard: "Local extension §2D.2",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A dashed person outline denotes an external contact in the local extension. Only the outline changes, retaining the seed size and person fill.",
    draw: () => [`<rect x="-24" y="-24" width="48" height="48" fill="${MALE}" stroke="${INK}" stroke-width="${W_SHAPE}" stroke-dasharray="6 4"/>`],
  },
  {
    id: "sibling-only-bracket", title: "Siblings with unknown parents",
    engine: null, dsl: ["A [male]\nB [female, sibling-of: A]"],
    standard: "Local library extension; not established by the supplied MFI or GenoPro sources",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A dashed bracket joins two people above their shapes without inventing parents. This is the local sibling-of form; the claimed pedigree clause remains not verified.",
    draw: () => [`<path d="M -48 -24 V -42 H 48 V -24" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" stroke-dasharray="6 4"/>`, square(-48, 0), circle(48, 0)],
  },
  {
    id: "unknown-siblings-placeholder", title: "Unknown siblings",
    engine: null, dsl: ["A -- B\n  ?", "[unknown-siblings]"],
    standard: "Local library extension; not established by the supplied MFI or GenoPro sources",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A question mark occupies the diamond at the end of a child drop, indicating an unknown number of siblings in the local extension. The question mark prevents this placeholder from being mistaken for a known nonbinary person.",
    draw: () => [...couple([]), line(0, 0, 0, 72), `<path d="M 0 72 L 24 96 L 0 120 L -24 96 Z" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}" stroke-linecap="butt" />`, `<text x="0" y="101" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}" text-anchor="middle">?</text>`],
  },
  {
    id: "step-child-connector", title: "Stepchild connector",
    engine: null, dsl: ["A -- B\n  child [step]"],
    standard: "Local library extension; not established by the supplied MFI or GenoPro sources",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A descent with two right-angle turns connects the union to an offset child. This is an engine extension rather than a published independent stepchild line form.",
    draw: () => [...couple([]), `<path d="M 0 0 V 48 H 48 V 96" fill="none" stroke="${INK}" stroke-width="${W_LINE}" stroke-linecap="butt" />`, square(48, 120)],
  },
  {
    id: "emotional-arrowhead", title: "Focused on",
    engine: null, dsl: ["A -focused-> B"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14–15 — https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "MFI Focused On is a straight line with a filled arrowhead pointing toward the person receiving the attention. There is no magnifier decoration.",
    draw: () => [line(-66, 0, 57, 0, INK, W_EMO), `<path d="M 57 -5 L 66 0 L 57 5 Z" fill="${INK}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "love", title: "Love",
    engine: null, dsl: ["A -love- B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A straight line with one hollow circle at its midpoint. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [line(-66, 0, -9, 0, INK, W_EMO), line(9, 0, 66, 0, INK, W_EMO), `<circle cx="0" cy="0" r="9" fill="none" stroke="${INK}" stroke-width="${W_EMO}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "in-love", title: "In love",
    engine: null, dsl: ["A -inlove- B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A straight line with two overlapping hollow circles at its midpoint. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [line(-66, 0, -14, 0, INK, W_EMO), line(14, 0, 66, 0, INK, W_EMO), `<circle cx="-5" cy="0" r="9" fill="none" stroke="${INK}" stroke-width="${W_EMO}"/>`, `<circle cx="5" cy="0" r="9" fill="none" stroke="${INK}" stroke-width="${W_EMO}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "distant-hostile", title: "Distant and hostile",
    engine: null, dsl: ["A -distant-hostile- B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A continuous zigzag over a separate dashed straight line. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [`<path d="M -66 0 H 66" fill="none" stroke="${INK}" stroke-width="${W_EMO}" stroke-dasharray="6 6"/>`, `<polyline points="-66,0 -55,-7 -44,7 -33,-7 -22,7 -11,-7 0,7 11,-7 22,7 33,-7 44,7 55,-7 66,0" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}" stroke-linejoin="round"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "never-met", title: "Never met",
    engine: null, dsl: ["A -nevermet- B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A straight line with a boxed X at its midpoint. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [line(-66, 0, -10, 0, INK, W_EMO), line(10, 0, 66, 0, INK, W_EMO), `<rect x="-10" y="-10" width="20" height="20" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}"/>`, line(-7, -7, 7, 7, INK, W_SHAPE), line(-7, 7, 7, -7, INK, W_SHAPE), square(-90, 0), circle(90, 0)],
  },
  {
    id: "neglect", title: "Neglect",
    engine: null, dsl: ["A -neglect-> B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A dashed line ending in an open arrowhead. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [`<path d="M -66 0 H 66" fill="none" stroke="${RED}" stroke-width="${W_EMO}" stroke-linecap="butt" stroke-dasharray="6 6"/>`, `<path d="M 57 -7 L 66 0 L 57 7" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "manipulative", title: "Manipulative relationship",
    engine: null, dsl: ["A -manipulative-> B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A straight open arrow with an X at its midpoint. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [line(-66, 0, 66, 0, RED, W_EMO), line(-7, -7, 7, 7, RED, W_SHAPE), line(-7, 7, 7, -7, RED, W_SHAPE), `<path d="M 57 -7 L 66 0 L 57 7" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "controlling", title: "Controlling relationship",
    engine: null, dsl: ["A -controlling-> B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A straight open arrow with a boxed X at its midpoint. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [line(-66, 0, -10, 0, RED, W_EMO), line(10, 0, 66, 0, RED, W_EMO), `<rect x="-10" y="-10" width="20" height="20" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}"/>`, line(-7, -7, 7, 7, RED, W_SHAPE), line(-7, 7, 7, -7, RED, W_SHAPE), `<path d="M 57 -7 L 66 0 L 57 7" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "distrust", title: "Distrust",
    engine: null, dsl: ["A -distrust- B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A straight line crossed by a row of short perpendicular ticks. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => {
      const ticks = [];
      for (let x = -54; x <= 54; x += 12) ticks.push(line(x, -7, x, 7, RED, W_SHAPE));
      return [line(-66, 0, 66, 0, INK, W_EMO), ...ticks, square(-90, 0), circle(90, 0)];
    },
  },
  {
    id: "admirer", title: "Admirer",
    engine: null, dsl: ["A -admirer-> B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An open arrow with one hollow circle at the midpoint (Fan / Admirer). McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [line(-66, 0, -9, 0, INK, W_EMO), line(9, 0, 66, 0, INK, W_EMO), `<circle cx="0" cy="0" r="9" fill="none" stroke="${INK}" stroke-width="${W_EMO}"/>`, `<path d="M 57 -7 L 66 0 L 57 7" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "limerence", title: "Limerence",
    engine: null, dsl: ["A -limerence-> B"],
    standard: "GenoPro emotional-relationship legend — https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An open arrow with two overlapping hollow circles at its midpoint. McGoldrick has no symbol for it in the MFI handout. GenoPro geometry is retained with the existing library palette.",
    draw: () => [line(-66, 0, -14, 0, INK, W_EMO), line(14, 0, 66, 0, INK, W_EMO), `<circle cx="-5" cy="0" r="9" fill="none" stroke="${INK}" stroke-width="${W_EMO}"/>`, `<circle cx="5" cy="0" r="9" fill="none" stroke="${INK}" stroke-width="${W_EMO}"/>`, `<path d="M 57 -7 L 66 0 L 57 7" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}"/>`, square(-90, 0), circle(90, 0)],
  },
  {
    id: "condition-three-quarter-fill", title: "Serious mental/physical problems plus substance abuse",
    engine: null, dsl: ["\u2014 (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14\u201315 \u2014 https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 2, usageUsers: null,
    notes: "MFI fills three quarters in black ink: left half plus lower-right quarter. The upper-right quarter stays unfilled. This denotes serious mental and physical problems plus substance abuse.",
    draw: () => [square(0, 0), `<path d="M -24 -24 H 0 V 0 H 24 V 24 H -24 Z" fill="${INK}"/>`, square(0, 0, "none")],
  },
  {
    id: "substance-abuse-recovery-fill", title: "In recovery from alcohol or drug abuse",
    engine: null, dsl: ["\u2014 (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14\u201315 \u2014 https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "MFI recovery from alcohol or drug abuse: black lower-left quarter, a full horizontal diameter, and a vertical radius down only. No vertical divider crosses the unfilled upper half.",
    draw: () => [circle(0, 0), `<path d="M 0 0 L -24 0 A 24 24 0 0 0 0 24 Z" fill="${SUBSTANCE}"/>`, line(-24, 0, 24, 0), line(0, 0, 0, 24), circle(0, 0, "none")],
  },
  {
    id: "combined-recovery-fill", title: "In recovery from substance abuse and illness",
    engine: null, dsl: ["\u2014 (not expressible)"],
    standard: "MFI Standard Symbols for Genograms (2017), SWAG Families of Origin pp. 14\u201315 \u2014 https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf",
    sourceUrl: "https://www.swagtoolkit.com/wp-content/uploads/2020/05/SWAG_Families-of-Origin.pdf", inExemplar: false, tier: 3, usageUsers: null,
    notes: "MFI recovery from substance abuse and mental or physical problems: black lower-left quarter with both full diameters, dividing all four quarters.",
    draw: () => [circle(0, 0), `<path d="M 0 0 L -24 0 A 24 24 0 0 0 0 24 Z" fill="${INK}"/>`, line(-24, 0, 24, 0), line(0, -24, 0, 24), circle(0, 0, "none")],
  },
  {
    id: "best-friends", title: "Best friends / very close",
    engine: null, dsl: ["A -bestfriends- B"],
    standard: "GenoPro emotional-relationship legend \u2014 https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two parallel lines crossed by short perpendicular ticks. McGoldrick has no symbol for it in the MFI handout; MFI fusion is a different, three-line relationship. The existing ink palette is retained.",
    draw: () => {
      const ticks = [];
      for (let x = -54; x <= 54; x += 12) ticks.push(line(x, -9, x, 9, INK, W_EMO));
      return [line(-66, -4, 67, -4, INK, W_EMO), line(-66, 4, 67, 4, INK, W_EMO), ...ticks, square(-90, 0), circle(90, 0)];
    },
  },
  {
    id: "jealous", title: "Jealous",
    engine: null, dsl: ["A -jealous-> B"],
    standard: "GenoPro emotional-relationship legend \u2014 https://genopro.com/genogram/emotional-relationships/",
    sourceUrl: "https://genopro.com/genogram/emotional-relationships/", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A straight open arrow with a hollow diamond at its midpoint. McGoldrick has no symbol for it in the MFI handout. This is distinct from the MFI physical-abuse zigzag; the existing red palette is retained.",
    draw: () => [line(-66, 0, -9, 0, RED, W_EMO), line(9, 0, 66, 0, RED, W_EMO), `<path d="M 0 -9 L 9 0 L 0 9 L -9 0 Z" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}"/>`, `<path d="M 57 -7 L 66 0 L 57 7" fill="none" stroke="${RED}" stroke-width="${W_SHAPE}"/>`, square(-90, 0), circle(90, 0)],
  },
];

await writeSet({
  type: "genogram", exemplar: "genogram",
  style: `Individuals are 48 x 48 squares and r = 24 circles outlined ${INK} at 2, filled ${MALE} (male) or ${FEMALE} (female); a deceased person carries a corner-to-corner X at 2, and the index person a second outline 4 units out in ${TEAL} at 1.8. Structural lines are ${INK} at 1.8 with butt caps, divorce and separation marks are slashes at 2. Emotional relationships are distinguished by line form at 1.7–2 (parallel lines, zigzag, broken line with end bars), with red ${RED} reserved for the negative ones. Lettering is Inter / Helvetica: 14 semibold ${INK} inside shapes, 11.5 ${SLATE} for dates.`,
}, SYMBOLS);
