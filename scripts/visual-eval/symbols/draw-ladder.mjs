/** Draw visual-eval/symbols/ladder/ — the ladder logic symbols in the ladder exemplar's style.
 *
 *   node scripts/visual-eval/symbols/draw-ladder.mjs
 *
 * Constants are lifted from visual-eval/exemplars/ladder/ideal.svg (1 unit = 1 exemplar px):
 * ink #20272B, secondary #59636B, rule #CBD1D6; symbol strokes at 2, rung wires at 1.5, power
 * rails at 3, butt caps. Contacts are two 28-unit blades 14 apart; coils are two 8 x 16 arcs 28
 * apart with the qualifier letter between them in 14 semibold; inline instructions are square
 * brackets with 6-unit returns; instruction blocks are ruled rectangles with a 14 semibold
 * mnemonic and 13-unit parameter rows. Symbols the exemplar does not contain are built from the
 * same parts.
 *
 * Library-wide rules (IEC 61131-3 §8.2, with Allen-Bradley notation where US engineers expect it):
 * - Every symbol carries 20-unit rung stubs on both sides at the exemplar's wire weight, so the
 *   sheet shows exactly where wires terminate: on a contact blade, a coil arc or a block edge.
 * - A qualifier that changes the logic (slash, L, U, S, R, P, N) is part of the symbol; the tag
 *   name above it is not, and belongs to the diagram.
 * - Letters inside a symbol are ink 14 semibold; parameter names inside a block are secondary.
 */
import { n2, esc, writeSet } from "./lib.mjs";

const FONT = "Inter, Helvetica Neue, Helvetica, Arial, sans-serif";
const INK = "#20272B", MUTED = "#59636B", RULE = "#CBD1D6";
const W_SYM = 2, W_WIRE = 1.5, W_RAIL = 3;
const STUB = 20;

const seg = (x1, y1, x2, y2, width = W_SYM, color = INK) =>
  `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="butt"/>`;
const wire = (x1, x2, y = 0) => seg(x1, y, x2, y, W_WIRE);
const letter = (x, y, s, size = 14, weight = 600, color = INK, anchor = "middle") =>
  `<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;

/** Contact blades at x = ±7, 28 high, with rung stubs. */
const contact = () => [wire(-7 - STUB, -7), wire(7, 7 + STUB), seg(-7, -14, -7, 14), seg(7, -14, 7, 14)];
/** Coil arcs: the exemplar's 8 x 16 arcs 28 apart, rung stubs meeting the arc crowns at x = ±22. */
const coil = (q) => [
  wire(-22 - STUB, -22), wire(22, 22 + STUB),
  `<path d="M -14 -16 A 8 16 0 0 0 -14 16" fill="none" stroke="${INK}" stroke-width="${W_SYM}"/>`,
  `<path d="M 14 -16 A 8 16 0 0 1 14 16" fill="none" stroke="${INK}" stroke-width="${W_SYM}"/>`,
  ...(q ? [letter(0, 5, q)] : []),
];
/** Inline bracketed instruction (Allen-Bradley ONS, RES), brackets at ±half with 6-unit returns. */
const bracket = (text, half = 29) => [
  wire(-half - STUB, -half), wire(half, half + STUB),
  seg(-half + 6, -14, -half, -14), seg(-half, -14, -half, 14), seg(-half, 14, -half + 6, 14),
  seg(half - 6, -14, half, -14), seg(half, -14, half, 14), seg(half, 14, half - 6, 14),
  letter(0, 5, text),
];

const SYMBOLS = [
  {
    id: "normally-open-contact", title: "Normally open contact (XIC)",
    engine: null, dsl: ["XIC(tag)"],
    standard: "IEC 61131-3:2013 §8.2.4, Table 75 no. 1 — normally open contact",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: two 28-unit blades 14 apart at the symbol weight, the rung wire stopping exactly on each blade.",
    draw: () => contact(),
  },
  {
    id: "normally-closed-contact", title: "Normally closed contact (XIO)",
    engine: null, dsl: ["XIO(tag)"],
    standard: "IEC 61131-3:2013 §8.2.4, Table 75 no. 2 — normally closed contact",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: the open contact with a slash from the lower-left of the left blade to the upper-right of the right blade, kept inside the blades so it never reads as a crossing wire.",
    draw: () => [...contact(), seg(-7, 11, 7, -11)],
  },
  {
    id: "output-coil", title: "Output coil (OTE)",
    engine: null, dsl: ["OTE(tag)"],
    standard: "IEC 61131-3:2013 §8.2.5, Table 76 no. 1 — coil",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: two facing 8 x 16 arcs 28 apart. The engine draws rung stubs meeting the arc crowns.",
    draw: () => coil(),
  },
  {
    id: "ab-latch-coil", title: "Latch coil (OTL)",
    engine: null, dsl: ["OTL(tag)"],
    standard: "Allen-Bradley Logix OTL; IEC 61131-3 §8.2.5 Table 76 no. 3 is the equivalent set coil (S)",
    sourceUrl: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/bit-instructions1.html",
    inExemplar: true, tier: 2, usageUsers: null,
    notes: "Copied from the exemplar: the coil with a 14 semibold L between the arcs. The engine draws L for OTL and U for OTU, with the wire meeting each arc crown.",
    draw: () => coil("L"),
  },
  {
    id: "ab-one-shot", title: "One-shot rising (ONS)",
    engine: null, dsl: ["ONS(tag)"],
    standard: "Allen-Bradley Logix ONS inline instruction; IEC 61131-3 §8.2.4 Table 75 no. 3 is the equivalent positive-transition contact (P)",
    sourceUrl: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/bit-instructions1/one-shot--ons-1.html",
    inExemplar: true, tier: 2, usageUsers: null,
    notes: "Copied from the exemplar: square brackets 58 apart with 6-unit returns and the mnemonic between them. The engine draws bracketed ONS and RES instructions.",
    draw: () => bracket("ONS"),
  },
  {
    id: "timer-on-delay-block", title: "On-delay timer block (TON)",
    engine: null, dsl: ["TON(timer, preset, accum)"],
    standard: "IEC 61131-3:2013 §8.2.6 function-block body; Allen-Bradley Logix TON with EN / DN status terminals",
    sourceUrl: null, inExemplar: true, tier: 2, usageUsers: null,
    notes: "Copied from the exemplar: a 244 x 116 ruled block, mnemonic and ON DELAY in the header, Timer / Preset / Accum rows with names in secondary and values in ink, and EN and DN status terminals drawn as coils on the right edge. The engine draws a ruled mnemonic header and separate parameter names and values, with two inline leads. EN/DN status terminals and named block pins are unavailable.",
    draw: () => {
      const x0 = -122, y0 = -20, w = 244, h = 116;
      const row = (y, name, value) => [letter(x0 + 12, y, name, 13, 400, MUTED, "start"), letter(x0 + w - 12, y, value, 13, 600, INK, "end")];
      const status = (cy, q) => [
        wire(x0 + w, x0 + w + 24, cy),
        `<path d="M ${x0 + w + 32} ${cy - 16} A 8 16 0 0 0 ${x0 + w + 32} ${cy + 16}" fill="none" stroke="${INK}" stroke-width="${W_SYM}"/>`,
        `<path d="M ${x0 + w + 60} ${cy - 16} A 8 16 0 0 1 ${x0 + w + 60} ${cy + 16}" fill="none" stroke="${INK}" stroke-width="${W_SYM}"/>`,
        letter(x0 + w + 46, cy + 5, q, 12),
      ];
      return [
        wire(x0 - STUB, x0),
        `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#FFFFFF" stroke="${INK}" stroke-width="${W_SYM}"/>`,
        letter(x0 + 12, y0 + 25, "TON"), letter(x0 + w - 12, y0 + 25, "ON DELAY", 12, 400, MUTED, "end"),
        seg(x0, y0 + 36, x0 + w, y0 + 36, 1, RULE),
        ...row(y0 + 56, "Timer", "SpeedProof"), ...row(y0 + 79, "Preset", "3000"), ...row(y0 + 102, "Accum", "0"),
        ...status(0, "EN"), ...status(42, "DN"),
        wire(x0 + w + 68, x0 + w + 68 + STUB),
      ];
    },
  },
  // Inventory additions, in tier/order. The accepted seeds above remain unchanged.
  // ab-inline-instruction is covered by ab-one-shot; its merge note is in inventory.md.
  {
    id: "left-power-rail", title: "Left power rail",
    engine: null, dsl: ["ladder"],
    standard: "IEC 61131-3:2013 §8.2.2, Table 74 — left power rail",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "A 3-unit vertical rail feeds a contact through its left stub. The thicker rail and rightward attachment identify the left boundary of an IEC ladder network; the engine already draws this relationship.",
    draw: () => [seg(-27, -33, -27, 33, W_RAIL), ...contact()],
  },
  {
    id: "right-power-rail", title: "Right power rail",
    engine: null, dsl: ["ladder"],
    standard: "IEC 61131-3:2013 §8.2.2, Table 74 — right power rail",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "An output coil ends on a 3-unit vertical rail through its right stub. The engine draws the rail and a lead meeting the coil crown.",
    draw: () => [...coil(), seg(42, -33, 42, 33, W_RAIL)],
  },
  {
    id: "horizontal-link", title: "Horizontal rung / series link",
    engine: null, dsl: ["rung 0:\n  XIC(Start)\n  OTE(Run)"],
    standard: "IEC 61131-3:2013 §8.2.3, Table 74 — horizontal link",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "A contact and coil share a horizontal wire made from their two 20-unit stubs. The continuous link carries ladder state between partner symbols at the exemplar wire weight; the engine generates these links automatically.",
    draw: () => [...contact(), `<g transform="translate(69 0)">${coil().join("")}</g>`],
  },
  {
    id: "vertical-link", title: "Parallel split and merge",
    engine: null, dsl: ["parallel:\n  branch:\n    XIC(Start)\n  branch:\n    XIC(Run)"],
    standard: "IEC 61131-3:2013 §8.2.3, Table 74 — vertical link",
    sourceUrl: null, inExemplar: true, tier: 1, usageUsers: null,
    notes: "Two contacts sit on branches 66 units apart, joined by vertical links at their stub ends. The upper T joints split and merge the parallel paths without ambiguous crossings; the engine supports this through parallel and branch blocks.",
    draw: () => [
      ...contact(), `<g transform="translate(0 66)">${contact().join("")}</g>`,
      seg(-27, 0, -27, 66, W_WIRE), seg(27, 0, 27, 66, W_WIRE),
      wire(-47, -27), wire(27, 47),
    ],
  },
  {
    id: "negated-coil", title: "Negated coil (OTN)",
    engine: null, dsl: ["OTN(tag)"],
    standard: "IEC 61131-3:2013 §8.2.5, Table 76 — negated coil",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "A diagonal slash sits inside the coil arcs, marking the IEC negated output. The engine draws the slash and stubs meeting both crowns.",
    draw: () => [...coil(), seg(-7, 11, 7, -11)],
  },
  {
    id: "set-coil", title: "IEC set coil (S)",
    engine: null, dsl: ["OTL(tag)"],
    standard: "IEC 61131-3:2013 §8.2.5, Table 76 — set coil",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "The qualifier S between the exemplar arcs identifies an IEC set coil. The engine draws Allen-Bradley L for OTL; the IEC S glyph has no DSL selection.",
    draw: () => coil("S"),
  },
  {
    id: "reset-coil", title: "IEC reset coil (R)",
    engine: null, dsl: ["OTU(tag)", "RES(tag)"],
    standard: "IEC 61131-3:2013 §8.2.5, Table 76 — reset coil",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "The qualifier R between the exemplar arcs identifies an IEC Boolean reset coil. The engine draws Allen-Bradley U for OTU and brackets around RES; the IEC R glyph has no DSL selection.",
    draw: () => coil("R"),
  },
  {
    id: "positive-transition-contact", title: "Positive-transition contact (P)",
    engine: null, dsl: ["ONS(tag)"],
    standard: "IEC 61131-3:2013 §8.2.4, Table 75 — positive-transition contact; vendor arrow form clause not verified",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "A P fits between the 28-unit contact blades, identifying the IEC positive-transition contact. The engine draws ONS as a bracketed inline instruction; the P contact glyph has no DSL selection.",
    draw: () => [...contact(), letter(0, 5, "P")],
  },
  {
    id: "negative-transition-contact", title: "Negative-transition contact (N)",
    engine: null, dsl: ["OSF(tag)"],
    standard: "IEC 61131-3:2013 §8.2.4, Table 75 — negative-transition contact; vendor arrow form clause not verified",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "An N fits between the contact blades, distinguishing the IEC negative-transition contact from P. The engine draws this form for OSF.",
    draw: () => [...contact(), letter(0, 5, "N")],
  },
  {
    id: "comparison-contact", title: "Comparison contact",
    engine: null, dsl: ["EQU(value, IN1=A, IN2=B)", "NEQ(value, IN1=A, IN2=B)", "GRT(value, IN1=A, IN2=B)", "LES(value, IN1=A, IN2=B)", "GEQ(value, IN1=A, IN2=B)", "LEQ(value, IN1=A, IN2=B)"],
    standard: "IEC 61131-3:2013 §8.2.4, Table 75 nos. 5a–5b — typed / overloaded compare contact",
    sourceUrl: "https://cache.industry.siemens.com/dl/files/748/109476748/att_845621/v1/IEC_61131_compliance_en_US.pdf",
    inExemplar: false, tier: 2, usageUsers: null,
    notes: "The comparison operator sits between contact terminals, with its two operands above and below, as shown in Table 75 reproduced in the Siemens compliance manual. The overloaded form represents the merged typed/overloaded family. The engine draws this contact layout, with IN1 above and IN2 below.",
    draw: () => [
      wire(-34, -14), wire(14, 34), seg(-14, -14, -14, 14), seg(14, -14, 14, 14),
      letter(0, 5, "≥"), letter(0, -25, "Count"), letter(0, 37, "450", 13, 600),
    ],
  },
  {
    id: "instruction-block", title: "Rectangular instruction body",
    engine: null, dsl: ["TON", "TOFF", "TP", "CTU", "CTD", "CTUD", "ADD", "SUB", "MUL", "DIV", "MOV"],
    standard: "IEC 61131-3:2013 §8.2.6 and §6.6.1.4.3 — rectangular body; Allen-Bradley operand-row presentation",
    sourceUrl: null, inExemplar: true, tier: 2, usageUsers: null,
    notes: "A 244 by 116 instruction body uses the exemplar header and three operand rows, here showing ADD. The engine draws timer, counter, arithmetic and move blocks with a ruled mnemonic header and separate parameter names and values. Comparisons use contact blades; named pins and status terminals are unavailable.",
    draw: () => [
      wire(-142, -122), wire(122, 142),
      `<rect x="-122" y="-20" width="244" height="116" fill="#FFFFFF" stroke="${INK}" stroke-width="${W_SYM}"/>`,
      letter(-110, 5, "ADD", 14, 600, INK, "start"), letter(110, 5, "ADD", 12, 400, MUTED, "end"),
      seg(-122, 16, 122, 16, 1, RULE),
      letter(-110, 36, "Source A", 13, 400, MUTED, "start"), letter(110, 36, "Count", 13, 600, INK, "end"),
      letter(-110, 59, "Source B", 13, 400, MUTED, "start"), letter(110, 59, "1", 13, 600, INK, "end"),
      letter(-110, 82, "Dest", 13, 400, MUTED, "start"), letter(110, 82, "NextCount", 13, 600, INK, "end"),
    ],
  },
  {
    id: "block-terminal", title: "IEC block input / output pins",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.2.6 and §6.6.1.4.3 — block terminals, EN / ENO",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "An IEC ADD block shows EN and ENO on the upper pin row, two left operand pins and an unnamed function-result pin on the right. The body keeps the exemplar dimensions and 23-unit row pitch; the engine has no named or independently connectable pins.",
    draw: () => [
      `<rect x="-122" y="-20" width="244" height="116" fill="#FFFFFF" stroke="${INK}" stroke-width="${W_SYM}"/>`,
      letter(-110, 5, "ADD", 14, 600, INK, "start"), seg(-122, 16, 122, 16, 1, RULE),
      ...[31, 54, 77].map(y => wire(-142, -122, y)), ...[31, 54].map(y => wire(122, 142, y)),
      letter(-110, 36, "EN", 13, 400, MUTED, "start"), letter(110, 36, "ENO", 13, 400, MUTED, "end"),
      letter(-110, 59, "IN1", 13, 400, MUTED, "start"), letter(-110, 82, "IN2", 13, 400, MUTED, "start"),
    ],
  },
  {
    id: "pin-negation", title: "Boolean pin negation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §6.6.1.4.3 rule 9 — negated Boolean terminal",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "An open 8-unit circle sits immediately outside a Boolean input on a block-edge excerpt, with the wire ending on the circle. Its external position makes this IEC pin negation rather than a contact or junction; the engine cannot express it.",
    draw: () => [
      wire(-28, -8), `<circle cx="-4" cy="0" r="4" fill="#FFFFFF" stroke="${INK}" stroke-width="${W_SYM}"/>`,
      seg(0, -20, 0, 46), seg(0, -20, 80, -20), seg(0, 46, 80, 46),
      letter(12, 5, "IN", 13, 400, MUTED, "start"),
    ],
  },
  {
    id: "edge-sensitive-pin", title: "Edge-sensitive input pin",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3 standard function-block diagrams — edge-sensitive input; clause not verified",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "A small open triangle points into a counter input on a block-edge excerpt, with CU beyond its tip. This is the edge-sensitive pin convention rather than an external negation bubble; clause not verified, and the engine has no pin modifier.",
    draw: () => [
      wire(-20, 0), seg(0, -20, 0, 46), seg(0, -20, 80, -20), seg(0, 46, 80, 46),
      seg(0, -6, 8, 0), seg(8, 0, 0, 6), letter(20, 5, "CU", 13, 400, MUTED, "start"),
    ],
  },
  {
    id: "ab-unlatch-coil", title: "Allen-Bradley unlatch coil (U)",
    engine: null, dsl: ["OTU(tag)"],
    standard: "Allen-Bradley Logix OTU; NEMA clause not verified",
    sourceUrl: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/bit-instructions1.html",
    inExemplar: true, tier: 2, usageUsers: null,
    notes: "The exemplar coil carries U, the Allen-Bradley unlatch qualifier paired with its L seed. The engine draws this form for OTU, with leads meeting the arc crowns; NEMA clause not verified.",
    draw: () => coil("U"),
  },
  {
    id: "ab-status-terminal", title: "Allen-Bradley block status terminal",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Allen-Bradley timer / counter status-terminal convention; clause not verified",
    sourceUrl: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/timer-and-counter-instructions/timer-on-delay--ton-.html",
    inExemplar: true, tier: 2, usageUsers: null,
    notes: "A right block-edge excerpt feeds the exemplar EN status parentheses, with a 12-unit qualifier and wires meeting both crowns. EN, DN and TT are merged label variants of this terminal family; clause not verified, and the engine draws no status terminals.",
    draw: () => [
      seg(-82, -20, -42, -20), seg(-42, -20, -42, 46), seg(-82, 46, -42, 46),
      ...coil(), letter(0, 5, "EN", 12),
    ],
  },
  {
    id: "energized-overlay", title: "Energized / true highlight",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Rockwell online-monitoring convention, clause not verified; IEC 61131-3:2013 §8.2.3 defines state, not highlight colour",
    sourceUrl: null, inExemplar: false, tier: 2, usageUsers: null,
    notes: "A rule-grey field highlights a contact and its rung stubs, with TRUE identifying the monitored state. This monochrome adaptation preserves the exemplar palette rather than prescribing a vendor highlight colour; clause not verified, and the engine has no energized overlay.",
    draw: () => [
      `<rect x="-31" y="-18" width="62" height="36" fill="${RULE}"/>`,
      ...contact(), letter(0, -29, "TRUE", 12),
    ],
  },
  {
    id: "rung-number", title: "Rung number",
    engine: null, dsl: ["rung 0:"],
    standard: "US ladder-editor numbering convention; clause not verified",
    sourceUrl: null, inExemplar: true, tier: 2, usageUsers: null,
    notes: "The three-digit number sits left of the power rail in secondary ink, aligned with a contact rung. This copies the exemplar editor adornment rather than adding an instruction; clause not verified, and the engine already generates rung numbers.",
    draw: () => [letter(-44, 5, "000", 13, 600, MUTED, "end"), seg(-27, -33, -27, 33, W_RAIL), ...contact()],
  },
  {
    id: "element-annotation", title: "Tag, address and description",
    engine: null, dsl: ['XIC(StartPB, address="I:0/0", name="Start pushbutton")'],
    standard: "IEC 61131-3:2013 §8.1.2 — graphical variable representation; US addressing convention clause not verified",
    sourceUrl: null, inExemplar: true, tier: 2, usageUsers: null,
    notes: "A contact carries an ink tag above, an address below and a secondary description on a separate line. These identify the variable without becoming a fixed contact qualifier; the engine supports all three fields, and the US address notation has clause not verified.",
    draw: () => [...contact(), letter(0, -25, "StartPB"), letter(0, 37, "I:0/0", 13, 400), letter(0, 60, "Start pushbutton", 12, 400, MUTED)],
  },
  {
    id: "rung-comment", title: "Rung comment",
    engine: null, dsl: ['rung 0 "Start spindle":'],
    standard: "IEC 61131-3:2013 §8.1.1 — network comments; US rung-comment convention clause not verified",
    sourceUrl: null, inExemplar: true, tier: 2, usageUsers: null,
    notes: "A secondary 14-unit comment sits above a rail and contact, with the exemplar clearance from the rung. This is network documentation rather than a logic element; the engine supports quoted rung comments, and the US placement convention has clause not verified.",
    draw: () => [letter(-11, -44, "Start spindle", 14, 400, MUTED, "start"), seg(-27, -20, -27, 33, W_RAIL), ...contact()],
  },
  {
    id: "positive-transition-coil", title: "Positive-transition coil (P)",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.2.5, Table 76 — positive-transition coil",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "P inside the exemplar coil identifies the IEC positive-transition output, distinct from the P contact’s straight blades. The engine has no transition-coil element; ONS draws a bracketed inline instruction.",
    draw: () => coil("P"),
  },
  {
    id: "negative-transition-coil", title: "Negative-transition coil (N)",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.2.5, Table 76 — negative-transition coil",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "N inside the exemplar coil identifies the IEC negative-transition output. It differs from both the P coil and the N contact; the engine has no transition-coil element and OSF only produces a contact.",
    draw: () => coil("N"),
  },
  {
    id: "jump-terminal", title: "IEC jump terminal",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.1.6, Table 73 — jump",
    sourceUrl: "https://cache.industry.siemens.com/dl/files/748/109476748/att_845621/v1/IEC_61131_compliance_en_US.pdf",
    inExemplar: false, tier: 3, usageUsers: null,
    notes: "A contact's outgoing wire ends in two right-pointing arrowheads followed by the target name. Conditional and unconditional jumps share this IEC terminal, so there is no outgoing rung stub beyond the destination; the engine cannot express either form.",
    draw: () => [...contact(), seg(19, -8, 27, 0), seg(27, 0, 19, 8), seg(27, -8, 35, 0), seg(35, 0, 27, 8), letter(45, 5, "NEXT", 14, 600, INK, "start")],
  },
  {
    id: "network-label", title: "IEC jump target / network label",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.1.4 and Table 73 — network label",
    sourceUrl: "https://cache.industry.siemens.com/dl/files/748/109476748/att_845621/v1/IEC_61131_compliance_en_US.pdf",
    inExemplar: false, tier: 3, usageUsers: null,
    notes: "NEXT followed by a colon labels the entry to a contact rung beside its left rail. The colon distinguishes an IEC jump target from an ordinary tag or comment; the engine has no network-label element.",
    draw: () => [letter(-27, -44, "NEXT:", 14, 600, INK, "start"), seg(-27, -20, -27, 33, W_RAIL), ...contact()],
  },
  {
    id: "return-terminal", title: "IEC return terminal",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.1.6, Table 73 — RETURN",
    sourceUrl: "https://cache.industry.siemens.com/dl/files/748/109476748/att_845621/v1/IEC_61131_compliance_en_US.pdf",
    inExemplar: false, tier: 3, usageUsers: null,
    notes: "A contact's outgoing wire meets the angle-delimited RETURN terminal from the IEC character representation. Conditional and unconditional returns share this terminal and have no outgoing rung; the engine has no return element.",
    draw: () => [
      ...contact(), seg(35, -12, 27, 0), seg(27, 0, 35, 12),
      letter(70, 5, "RETURN"), seg(105, -12, 113, 0), seg(113, 0, 105, 12),
    ],
  },
  {
    id: "connection-continuation", title: "Named connection continuation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.1.3 — named connections; specific glyph clause not verified",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two separated rung fragments terminate at matching LINK_A names, with a contact before the break and a coil after it. The shared name indicates continuity without a physical crossing; the specific glyph has clause not verified, and the engine has no named continuation.",
    draw: () => [
      ...contact(), letter(35, 5, "LINK_A", 13, 600, INK, "start"),
      `<g transform="translate(140 66)">${coil().join("")}</g>`, letter(90, 71, "LINK_A", 13, 600, INK, "end"),
    ],
  },
  {
    id: "connected-crossing", title: "Connected four-way crossing",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.1.3 — connection relationships; specific glyph clause not verified",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A filled junction dot joins a vertical descent to the horizontal link between a contact and coil. The dot explicitly joins all four arms rather than merely crossing them; the specific glyph has clause not verified, and the DSL cannot request this junction.",
    draw: () => [
      ...contact(), `<g transform="translate(69 0)">${coil().join("")}</g>`,
      seg(27, -33, 27, 33, W_WIRE), `<circle cx="27" cy="0" r="3" fill="${INK}"/>`,
    ],
  },
  {
    id: "unconnected-crossing", title: "Unconnected crossing",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §8.1.3 — connection relationships; specific glyph clause not verified",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "A vertical descent has a clear gap where it crosses the horizontal link between a contact and coil, with no junction dot. This distinguishes an unconnected crossing from the four-way junction; the specific glyph has clause not verified, and the engine cannot request this relationship.",
    draw: () => [
      ...contact(), `<g transform="translate(69 0)">${coil().join("")}</g>`,
      seg(27, -33, 27, -5, W_WIRE), seg(27, 5, 27, 33, W_WIRE),
    ],
  },
  {
    id: "in-out-terminal-pair", title: "VAR_IN_OUT terminal pair",
    engine: null, dsl: ["— (not expressible)"],
    standard: "IEC 61131-3:2013 §6.6.1.4, Figure 10 — VAR_IN_OUT pair",
    sourceUrl: null, inExemplar: false, tier: 3, usageUsers: null,
    notes: "An INC block carries matching V terminals connected across its interior, below a separate EN/ENO row. The shared formal name and internal line identify one VAR_IN_OUT variable rather than independent input and output values; the engine cannot express the pair.",
    draw: () => [
      `<rect x="-122" y="-20" width="244" height="93" fill="#FFFFFF" stroke="${INK}" stroke-width="${W_SYM}"/>`,
      letter(-110, 5, "INC", 14, 600, INK, "start"), seg(-122, 16, 122, 16, 1, RULE),
      wire(-142, -122, 31), wire(122, 142, 31),
      letter(-110, 36, "EN", 13, 400, MUTED, "start"), letter(110, 36, "ENO", 13, 400, MUTED, "end"),
      wire(-142, -122, 54), wire(122, 142, 54),
      letter(-110, 59, "V", 13, 400, MUTED, "start"), letter(110, 59, "V", 13, 400, MUTED, "end"), wire(-96, 96, 54),
    ],
  },
  {
    id: "ab-jump-marker", title: "Allen-Bradley jump marker (JMP)",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Allen-Bradley JMP convention; clause not verified",
    sourceUrl: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/program-control-instructions/jump-to-label--jmp--and-label--lbl-.html",
    inExemplar: false, tier: 3, usageUsers: null,
    notes: "JMP sits between outward-facing angle marks at the right rail, with its target above, following the Rockwell instruction figure. This vendor outline differs from the IEC double arrow; clause not verified, and JMP is rejected by the engine parser.",
    draw: () => [
      wire(-49, -29), wire(29, 49), seg(-21, -14, -29, 0), seg(-29, 0, -21, 14),
      letter(0, 5, "JMP"), seg(21, -14, 29, 0), seg(29, 0, 21, 14), letter(0, -25, "NEXT"),
      seg(49, -33, 49, 33, W_RAIL),
    ],
  },
  {
    id: "ab-label-marker", title: "Allen-Bradley label marker (LBL)",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Allen-Bradley LBL convention; clause not verified",
    sourceUrl: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/program-control-instructions/jump-to-label--jmp--and-label--lbl-.html",
    inExemplar: false, tier: 3, usageUsers: null,
    notes: "LBL uses the exemplar square brackets at the start of a rung, with the target name above and a contact after it, following the Rockwell instruction figure. Its distinctive context is the network entry rather than a new bracket geometry; clause not verified, and LBL is rejected by the engine parser.",
    draw: () => [
      ...bracket("LBL"), letter(0, -25, "NEXT"), seg(-49, -33, -49, 33, W_RAIL),
      `<g transform="translate(76 0)">${contact().join("")}</g>`,
    ],
  },
  {
    id: "routine-end-marker", title: "Routine end marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Rockwell ladder-editor END convention; clause not verified",
    sourceUrl: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/9399-um013_-en-p.pdf",
    inExemplar: false, tier: 3, usageUsers: null,
    notes: "END appears in the exemplar brackets on its own final rung, with both rails stopping just below it. The final-rung context distinguishes this editor terminator from an ordinary inline instruction, so mnemonic-only variants are merged here; clause not verified, and the engine has no end marker.",
    draw: () => [...bracket("END"), seg(-49, -33, -49, 20, W_RAIL), seg(49, -33, 49, 20, W_RAIL)],
  },
  {
    id: "forced-io-overlay", title: "Forced I/O indicator",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Rockwell online-monitoring forced-I/O convention; clause not verified",
    sourceUrl: "https://www.rockwellautomation.com/en-no/docs/studio-5000-logix-designer/38-00/contents-ditamap/studio-5000-logix-designer/force/force-in-the-ladder-editor.html",
    inExemplar: false, tier: 3, usageUsers: null,
    notes: "A filled right-pointing triangle and ON appear above a contact, indicating an enabled force beside its Boolean value. This uses the documented Rockwell mark in exemplar ink instead of the configurable vendor colour; clause not verified, and the engine cannot display forces.",
    draw: () => [...contact(), `<path d="M -23 -38 L -15 -33 L -23 -28 Z" fill="${INK}"/>`, letter(-7, -28, "ON", 12, 600, INK, "start")],
  },
  {
    id: "online-edit-marker", title: "Online edit rung margin marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "Rockwell online-editing convention; clause not verified",
    sourceUrl: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/9399-um013_-en-p.pdf",
    inExemplar: false, tier: 3, usageUsers: null,
    notes: "Repeated I marks occupy the margin beside a contact rung and its power rail, indicating an inserted edit zone. Deleted D and replaced R are merged text variants of the same margin treatment; clause not verified, and the engine has no online-edit state.",
    draw: () => [
      seg(-27, -33, -27, 33, W_RAIL), ...contact(),
      ...[-18, 5, 28].map(y => letter(-44, y, "I", 14, 600, MUTED)),
    ],
  },
];

await writeSet({
  type: "ladder", exemplar: "ladder",
  style: `IEC 61131-3 ladder with Allen-Bradley notation, ink ${INK} on white. Symbol strokes 2, rung wires 1.5, power rails 3, butt caps. Contacts are two 28-unit blades 14 apart (normally closed adds a slash between them); coils are two facing 8 x 16 arcs 28 apart with the qualifier letter between; inline instructions are square brackets with 6-unit returns; instruction blocks are ruled rectangles (header rule ${RULE} at 1) with a 14 semibold mnemonic, 13-unit parameter rows (names ${MUTED}, values ink semibold) and status terminals drawn as coils on the right edge. Lettering is Inter / Helvetica: 14 semibold ink inside symbols. Every symbol shows 20-unit rung stubs.`,
}, SYMBOLS);
