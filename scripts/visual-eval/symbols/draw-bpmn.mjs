/** Draw visual-eval/symbols/bpmn/ — the BPMN symbols in the bpmn exemplar's style.
 *
 *   node scripts/visual-eval/symbols/draw-bpmn.mjs
 *
 * Constants are lifted from visual-eval/exemplars/bpmn/ideal.svg (1 unit = 1 exemplar px):
 * ink #263238, secondary #59656B, rule #A8B1B5, band #F0F3F4. Flow-object outlines at 1.6,
 * sequence and message flows at 1.5, glyphs and markers at 1.2; events r = 18 (end events at
 * 3.2, intermediate events a second ring at r = 14), tasks 130 x 84 with 10-unit corners,
 * gateways a diamond of half-diagonal 24 with markers at 2.4–3, filled 10 x 9 arrowheads.
 * Symbols the exemplar does not contain are built from the same parts.
 *
 * Library-wide rules (OMG BPMN 2.0.2, formal/13-12-09):
 * - A trigger glyph is hollow when the event catches and filled when it throws; the event
 *   outline (thin, double, thick, dashed) carries start / intermediate / end / non-interrupting.
 * - Task-type markers sit at the task's top-left, loop and multi-instance markers at the bottom
 *   centre, exactly where the exemplar puts them.
 * - Flow symbols are drawn as a 120-unit sample; flow objects are drawn alone, no label.
 */
import { n2, writeSet } from "./lib.mjs";

const INK = "#263238", PAPER = "#FFFFFF";
const W_SHAPE = 1.6, W_FLOW = 1.5, W_GLYPH = 1.2, W_END = 3.2;

const circle = (r, width = W_SHAPE, extra = "") => `<circle cx="0" cy="0" r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="${width}"${extra}/>`;
const path = (d, width = W_GLYPH, fill = "none", extra = "") => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${width}"${extra}/>`;
/** Filled 10 x 9 arrowhead whose tip is at (x, y), pointing right. */
const headRight = (x, y, fill = INK) => `<polygon points="${n2(x - 10)},${n2(y + 4.5)} ${n2(x)},${n2(y)} ${n2(x - 10)},${n2(y - 4.5)}" fill="${fill}" stroke="${INK}" stroke-width="${W_GLYPH}" stroke-linejoin="round"/>`;
/** Envelope 20 x 14 centred on (cx, cy): hollow when catching, filled when throwing. */
const envelope = (cx, cy, filled) => [
  `<rect x="${n2(cx - 10)}" y="${n2(cy - 7)}" width="20" height="14" fill="${filled ? INK : PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
  `<path d="M ${n2(cx - 9)} ${n2(cy - 6)} L ${n2(cx)} ${n2(cy + 1)} L ${n2(cx + 9)} ${n2(cy - 6)}" fill="none" stroke="${filled ? PAPER : INK}" stroke-width="${W_GLYPH}"/>`,
];
const diamond = () => `<polygon points="0,-24 24,0 0,24 -24,0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`;

const SYMBOLS = [
  {
    id: "start-event-outline", title: "Start event (None)",
    engine: null, dsl: ["start", "start none"],
    standard: "OMG BPMN 2.0.2 §10.5.2, Fig. 10.70 — start event: single thin circle",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: an r = 18 circle at the 1.6 outline weight, empty for a None trigger.",
    draw: () => [circle(18)],
  },
  {
    id: "end-event-outline", title: "End event (None)",
    engine: null, dsl: ["end", "end none"],
    standard: "OMG BPMN 2.0.2 §10.5.3, Fig. 10.71 — end event: single thick circle",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: the same r = 18 circle at 3.2, twice the start weight, so start and end are told apart by outline alone.",
    draw: () => [circle(18, W_END)],
  },
  {
    id: "intermediate-message-catch", title: "Intermediate message event (catching)",
    engine: null, dsl: ["intermediate message"],
    standard: "OMG BPMN 2.0.2 §10.5.4 Fig. 10.72 double circle; §10.5.5 Fig. 10.88 hollow envelope for catching",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Built from the exemplar's parts: the r = 18 outline with the inner r = 14 ring at 1.2, and the 20 x 14 envelope hollow because the event catches. The exemplar only draws the throwing form, with a filled envelope.",
    draw: () => [circle(18), `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`, ...envelope(0, 0, false)],
  },
  {
    id: "task", title: "Task",
    engine: null, dsl: ['task "…"'],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.8 — task: rounded rectangle",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a 130 x 84 rectangle with 10-unit corners at 1.6. Labels are centred inside and wrap; the task keeps its height so markers have fixed places.",
    draw: () => [`<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`],
  },
  {
    id: "exclusive-gateway", title: "Exclusive gateway",
    engine: null, dsl: ["gateway xor"],
    standard: "OMG BPMN 2.0.2 §10.6.2, Fig. 10.106 — diamond with X marker",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a diamond of half-diagonal 24 at 1.6 with a 14 x 16 X at 2.4. The marker is drawn, not omitted, so exclusive and unmarked gateways never look alike.",
    draw: () => [diamond(), path("M -7 -8 l 14 16 M 7 -8 l -14 16", 2.4)],
  },
  {
    id: "parallel-gateway", title: "Parallel gateway",
    engine: null, dsl: ["gateway and"],
    standard: "OMG BPMN 2.0.2 §10.6.4, Fig. 10.110 — diamond with plus marker",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: the same diamond with an 18-unit plus at 3, heavier than the X so the two read apart at a glance.",
    draw: () => [diamond(), path("M -9 0 h 18 M 0 -9 v 18", 3)],
  },
  {
    id: "sequence-flow", title: "Sequence flow",
    engine: null, dsl: ["A --> B"],
    standard: "OMG BPMN 2.0.2 §8.4.13, Fig. 8.32 — solid line with solid arrowhead",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a 1.5 solid line ending in a filled 10 x 9 arrowhead whose tip touches the target.",
    draw: () => [path("M -60 0 H 50", W_FLOW), headRight(60, 0)],
  },
  {
    id: "message-flow", title: "Message flow",
    engine: null, dsl: ["A ~~> B"],
    standard: "OMG BPMN 2.0.2 §9.4, Fig. 9.11 — dashed line, hollow circle at the source, hollow arrowhead at the target",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Copied from the exemplar: a 1.5 line dashed 7 / 5, an r = 4 hollow circle at the source and a hollow 10 x 9 arrowhead at the target. The engine paints the hollow source circle after the flow objects, keeping the full circle visible.",
    draw: () => [path("M -56 0 H 50", W_FLOW, "none", ' stroke-dasharray="7 5"'), `<circle cx="-60" cy="0" r="4" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`, headRight(60, 0, PAPER)],
  },
  // Inventory additions: Tier 1, then Tier 2, then Tier 3. Accepted seeds above stay unchanged.
  {
    id: "default-flow-marker", title: "Default-flow slash",
    engine: null, dsl: ["A --* \"…\" --> B", "A --*--> B"],
    standard: "OMG BPMN 2.0.2 §8.4.13, Fig. 8.34",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "A complete slash sits 11 units beyond the source gateway on a 120-unit sequence flow, identifying its default branch. The engine draws the complete slash beyond the source boundary and paints it after the flow objects.",
    draw: () => [
      `<polygon points="-84,-24 -60,0 -84,24 -108,0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M -60 0 H 50", W_FLOW, "none"),
      headRight(60, 0),
      path("M -54 6 L -44 -6", W_FLOW, "none")
    ],
  },
  {
    id: "pool", title: "Pool",
    engine: null, dsl: ["pool \"…\" { … }", "direction: LR", "direction: TB"],
    standard: "OMG BPMN 2.0.2 §9.3, Fig. 9.2",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "The participant frame retains the exemplar's 38-unit name band and contains a short process at full event scale. The shortened container represents a white-box pool whose process is visible.",
    draw: () => [
      `<rect x="-110" y="-56" width="220" height="112" fill="${PAPER}" stroke="#A8B1B5" stroke-width="1"/>`,
      `<rect x="-110" y="-56" width="38" height="112" fill="#F0F3F4" stroke="#A8B1B5" stroke-width="1"/>`,
      `<g transform="translate(-91 0) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Pool</text>`,
      `</g>`,
      `<g transform="translate(-30 0)">`,
      circle(18),
      `</g>`,
      `<g transform="translate(70 0)">`,
      circle(18, W_END),
      `</g>`,
      path("M -12 0 H 42", W_FLOW, "none"),
      headRight(52, 0)
    ],
  },
  {
    id: "black-box-pool", title: "Black-box pool",
    engine: null, dsl: ["pool \"…\" blackbox"],
    standard: "OMG BPMN 2.0.2 §9.3, Fig. 9.3",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "A 64-unit-high participant rectangle contains its name and no visible process, as in the exemplar's laboratory pool. Its absence of internal flow objects identifies the black-box presentation.",
    draw: () => [
      `<rect x="-110" y="-32" width="220" height="64" fill="${PAPER}" stroke="#A8B1B5" stroke-width="1"/>`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Participant</text>`
    ],
  },
  {
    id: "lane", title: "Lane",
    engine: null, dsl: ["lane \"…\" { … }"],
    standard: "OMG BPMN 2.0.2 §10.8, Figs. 10.123–10.124",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 1, usageUsers: null,
    notes: "Two named subdivisions sit inside one participant frame, with the exemplar's 38-unit bands and structural rules. The internal sequence flow crosses the lane divider within the same pool.",
    draw: () => [
      `<rect x="-110" y="-100" width="220" height="200" fill="${PAPER}" stroke="#A8B1B5" stroke-width="1"/>`,
      `<rect x="-110" y="-100" width="38" height="200" fill="#F0F3F4" stroke="#A8B1B5" stroke-width="1"/>`,
      `<g transform="translate(-91 0) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Pool</text>`,
      `</g>`,
      `<rect x="-72" y="-100" width="38" height="200" fill="#F0F3F4" stroke="#A8B1B5" stroke-width="1"/>`,
      `<path d="M -72 0 H 110" fill="none" stroke="#A8B1B5" stroke-width="1"/>`,
      `<g transform="translate(-53 -50) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Lane A</text>`,
      `</g>`,
      `<g transform="translate(-53 50) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Lane B</text>`,
      `</g>`,
      `<g transform="translate(38 -50)">`,
      circle(18),
      `</g>`,
      `<g transform="translate(38 50)">`,
      circle(18, W_END),
      `</g>`,
      path("M 38 -32 V 22", W_FLOW, "none"),
      `<g transform="translate(38 0) rotate(90)">`,
      headRight(32, 0),
      `</g>`
    ],
  },
  {
    id: "intermediate-event-outline", title: "Intermediate event outline",
    engine: null, dsl: ["intermediate", "intermediate none"],
    standard: "OMG BPMN 2.0.2 §10.5.4, Fig. 10.72; Table 10.89",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Two thin concentric rings distinguish an intermediate event from start and end events. With no trigger this is the None intermediate throwing form in Table 10.89.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`
    ],
  },
  {
    id: "interrupting-boundary-event", title: "Interrupting boundary event",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.4, Table 10.90",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Solid double rings attach a timer to the activity boundary, using the exemplar's 16-unit boundary radius. Solid rings mean the activity is interrupted when the timer fires. The engine cannot express boundary attachment or this event form.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-35 42)">`,
      `<circle cx="0" cy="0" r="16" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<circle cx="0" cy="0" r="12" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<circle cx="0" cy="0" r="8" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0.0 6.5 L 0.0 8.0", W_GLYPH, "none"),
      path("M 3.25 5.629 L 4.0 6.928", W_GLYPH, "none"),
      path("M 5.629 3.25 L 6.928 4.0", W_GLYPH, "none"),
      path("M 6.5 0.0 L 8.0 0.0", W_GLYPH, "none"),
      path("M 5.629 -3.25 L 6.928 -4.0", W_GLYPH, "none"),
      path("M 3.25 -5.629 L 4.0 -6.928", W_GLYPH, "none"),
      path("M 0.0 -6.5 L 0.0 -8.0", W_GLYPH, "none"),
      path("M -3.25 -5.629 L -4.0 -6.928", W_GLYPH, "none"),
      path("M -5.629 -3.25 L -6.928 -4.0", W_GLYPH, "none"),
      path("M -6.5 -0.0 L -8.0 -0.0", W_GLYPH, "none"),
      path("M -5.629 3.25 L -6.928 4.0", W_GLYPH, "none"),
      path("M -3.25 5.629 L -4.0 6.928", W_GLYPH, "none"),
      path("M 0 -5 v 5 l 4 2", W_GLYPH, "none"),
      `</g>`
    ],
  },
  {
    id: "non-interrupting-boundary-event", title: "Non-interrupting boundary event",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.4, Table 10.90",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Dashed double rings attach a timer to the activity boundary, using the exemplar's 16-unit boundary radius. Dashes mean the activity continues when the timer fires. The engine cannot express boundary attachment or this event form.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-35 42)">`,
      `<circle cx="0" cy="0" r="16" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}" stroke-dasharray="4 3"/>`,
      `<circle cx="0" cy="0" r="12" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}" stroke-dasharray="4 3"/>`,
      `<circle cx="0" cy="0" r="8" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0.0 6.5 L 0.0 8.0", W_GLYPH, "none"),
      path("M 3.25 5.629 L 4.0 6.928", W_GLYPH, "none"),
      path("M 5.629 3.25 L 6.928 4.0", W_GLYPH, "none"),
      path("M 6.5 0.0 L 8.0 0.0", W_GLYPH, "none"),
      path("M 5.629 -3.25 L 6.928 -4.0", W_GLYPH, "none"),
      path("M 3.25 -5.629 L 4.0 -6.928", W_GLYPH, "none"),
      path("M 0.0 -6.5 L 0.0 -8.0", W_GLYPH, "none"),
      path("M -3.25 -5.629 L -4.0 -6.928", W_GLYPH, "none"),
      path("M -5.629 -3.25 L -6.928 -4.0", W_GLYPH, "none"),
      path("M -6.5 -0.0 L -8.0 -0.0", W_GLYPH, "none"),
      path("M -5.629 3.25 L -6.928 4.0", W_GLYPH, "none"),
      path("M -3.25 5.629 L -4.0 6.928", W_GLYPH, "none"),
      path("M 0 -5 v 5 l 4 2", W_GLYPH, "none"),
      `</g>`
    ],
  },
  {
    id: "message-catch-marker", title: "Message catch glyph",
    engine: null, dsl: ["start message", "intermediate message"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.88",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "The exemplar's hollow envelope is shown in a thin start ring, identifying receipt of a message that starts the process. The accepted intermediate-message-catch seed shows the same trigger in an intermediate ring.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      ...envelope(0, 0, false)
    ],
  },
  {
    id: "message-throw-marker", title: "Message throw glyph",
    engine: null, dsl: ["end message"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.88",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A filled envelope in a thick end ring identifies a Message End event; the white flap line preserves the exemplar's envelope detail. The engine accepts this as end message.",
    draw: () => [
      circle(18, W_END, ""),
      ...envelope(0, 0, true)
    ],
  },
  {
    id: "intermediate-message-throw", title: "Intermediate message throw",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.4, Table 10.89",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "The exemplar's double ring encloses a filled envelope, identifying a message sent midway through the process. The renderer can fill the glyph but the parser forces intermediate message events to catch.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      ...envelope(0, 0, true)
    ],
  },
  {
    id: "timer-marker", title: "Timer glyph",
    engine: null, dsl: ["start timer", "intermediate timer"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.96",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A clock with twelve ticks and hands sits in a double ring, identifying a catching intermediate Timer event. The clock follows the exemplar's boundary-timer geometry at the same scale.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<circle cx="0" cy="0" r="8" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0.0 6.5 L 0.0 8.0", W_GLYPH, "none"),
      path("M 3.25 5.629 L 4.0 6.928", W_GLYPH, "none"),
      path("M 5.629 3.25 L 6.928 4.0", W_GLYPH, "none"),
      path("M 6.5 0.0 L 8.0 0.0", W_GLYPH, "none"),
      path("M 5.629 -3.25 L 6.928 -4.0", W_GLYPH, "none"),
      path("M 3.25 -5.629 L 4.0 -6.928", W_GLYPH, "none"),
      path("M 0.0 -6.5 L 0.0 -8.0", W_GLYPH, "none"),
      path("M -3.25 -5.629 L -4.0 -6.928", W_GLYPH, "none"),
      path("M -5.629 -3.25 L -6.928 -4.0", W_GLYPH, "none"),
      path("M -6.5 -0.0 L -8.0 -0.0", W_GLYPH, "none"),
      path("M -5.629 3.25 L -6.928 4.0", W_GLYPH, "none"),
      path("M -3.25 5.629 L -4.0 6.928", W_GLYPH, "none"),
      path("M 0 -5 v 5 l 4 2", W_GLYPH, "none")
    ],
  },
  {
    id: "error-catch-marker", title: "Error catch glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.79",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A hollow lightning bolt identifies the catching Error trigger. It is attached as an interrupting boundary event, since an Error catch is not an ordinary intermediate wait. The engine cannot express this trigger.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-35 42)">`,
      `<circle cx="0" cy="0" r="16" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<circle cx="0" cy="0" r="12" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -6 -7.5 L -1.5 -1.5 L 2.25 -5.25 L 6 7.5 L 0.75 1.5 L -3 5.25 Z", W_GLYPH, PAPER),
      `</g>`
    ],
  },
  {
    id: "error-throw-marker", title: "Error throw glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.79",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A filled lightning bolt identifies the throwing Error trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_END, ""),
      path("M -8 -10 L -2 -2 L 3 -7 L 8 10 L 1 2 L -4 7 Z", W_GLYPH, INK)
    ],
  },
  {
    id: "signal-catch-marker", title: "Signal catch glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.94",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A hollow triangle identifies the catching Signal trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -10 L 9 7 H -9 Z", W_GLYPH, PAPER)
    ],
  },
  {
    id: "signal-throw-marker", title: "Signal throw glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.94",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A filled triangle identifies the throwing Signal trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_END, ""),
      path("M 0 -10 L 9 7 H -9 Z", W_GLYPH, INK)
    ],
  },
  {
    id: "conditional-event-marker", title: "Conditional event glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.77",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A small lined document identifies a condition becoming true, shown in a catching intermediate ring. The engine has no Conditional event trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<rect x="-7" y="-10" width="14" height="20" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 -6 H 4 M -4 -2 H 4 M -4 2 H 4 M -4 6 H 4", W_GLYPH, "none")
    ],
  },
  {
    id: "terminate-marker", title: "Terminate end glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.95",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "The exemplar's solid disk inside a thick end ring identifies termination of all remaining work in the scope. The engine only draws an empty None End and cannot express Terminate.",
    draw: () => [
      circle(18, W_END, ""),
      `<circle cx="0" cy="0" r="10" fill="${INK}"/>`
    ],
  },
  {
    id: "user-task-marker", title: "User task marker",
    engine: null, dsl: ["task user \"…\""],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.17",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "The exemplar's person marker occupies the task's upper-left slot, distinguishing work performed by a user with software support. The task body keeps the accepted 130 by 84 geometry.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-44 -24)">`,
      `<circle cx="0" cy="-5" r="4" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -8 9 v -4 Q -8 0 -3 0 h 6 Q 8 0 8 5 v 4 Z", W_GLYPH, INK),
      `<path d="M -3 4 v 5 M 3 4 v 5" fill="none" stroke="${PAPER}" stroke-width="${W_GLYPH}"/>`,
      `</g>`
    ],
  },
  {
    id: "service-task-marker", title: "Service task marker",
    engine: null, dsl: ["task service \"…\""],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.11",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Two toothed gears copy the exemplar's Service task emblem at its original size and upper-left position. The engine draws two toothed gears with hollow hubs.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<polygon points="-42.3,-27 -40.564,-26.021 -40.756,-25.059 -41.071,-24.13 -43.064,-24.15 -43.478,-23.53 -43.969,-22.969 -43.434,-21.05 -44.25,-20.505 -45.13,-20.071 -46.525,-21.494 -47.256,-21.349 -48,-21.3 -48.979,-19.564 -49.941,-19.756 -50.87,-20.071 -50.85,-22.064 -51.47,-22.478 -52.031,-22.969 -53.95,-22.434 -54.495,-23.25 -54.929,-24.13 -53.506,-25.525 -53.651,-26.256 -53.7,-27 -55.436,-27.979 -55.244,-28.941 -54.929,-29.87 -52.936,-29.85 -52.522,-30.47 -52.031,-31.031 -52.566,-32.95 -51.75,-33.495 -50.87,-33.929 -49.475,-32.506 -48.744,-32.651 -48,-32.7 -47.021,-34.436 -46.059,-34.244 -45.13,-33.929 -45.15,-31.936 -44.53,-31.522 -43.969,-31.031 -42.05,-31.566 -41.505,-30.75 -41.071,-29.87 -42.494,-28.475 -42.349,-27.744" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<circle cx="-48" cy="-27" r="2.25" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<polygon points="-33.82,-18 -32.547,-17.282 -32.687,-16.576 -32.919,-15.895 -34.38,-15.91 -34.684,-15.455 -35.044,-15.044 -34.652,-13.637 -35.25,-13.237 -35.895,-12.919 -36.918,-13.962 -37.454,-13.856 -38,-13.82 -38.718,-12.547 -39.424,-12.687 -40.105,-12.919 -40.09,-14.38 -40.545,-14.684 -40.956,-15.044 -42.363,-14.652 -42.763,-15.25 -43.081,-15.895 -42.038,-16.918 -42.144,-17.454 -42.18,-18 -43.453,-18.718 -43.313,-19.424 -43.081,-20.105 -41.62,-20.09 -41.316,-20.545 -40.956,-20.956 -41.348,-22.363 -40.75,-22.763 -40.105,-23.081 -39.082,-22.038 -38.546,-22.144 -38,-22.18 -37.282,-23.453 -36.576,-23.313 -35.895,-23.081 -35.91,-21.62 -35.455,-21.316 -35.044,-20.956 -33.637,-21.348 -33.237,-20.75 -32.919,-20.105 -33.962,-19.082 -33.856,-18.546" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<circle cx="-38" cy="-18" r="1.65" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`
    ],
  },
  {
    id: "send-task-marker", title: "Send task marker",
    engine: null, dsl: ["task send \"…\""],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.13",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A filled envelope in the upper-left task slot identifies a Send task. The 20 by 14 envelope and task body copy the exemplar.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-44 -24)">`,
      ...envelope(0, 0, true),
      `</g>`
    ],
  },
  {
    id: "receive-task-marker", title: "Receive task marker",
    engine: null, dsl: ["task receive \"…\""],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.15",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A hollow envelope in the upper-left task slot identifies a Receive task. The 20 by 14 envelope and task body copy the exemplar.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-44 -24)">`,
      ...envelope(0, 0, false),
      `</g>`
    ],
  },
  {
    id: "manual-task-marker", title: "Manual task marker",
    engine: null, dsl: ["task manual \"…\""],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.18",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "An outlined hand with thumb and separate finger lines sits in the upper-left slot, identifying work done without software execution. It uses the same marker weight and footprint as the other task types.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-44 -24)">`,
      path("M -10 7 V -1 L -5 -2 L -1 -8 Q 1 -10 2 -8 L 0 -3 H 10 Q 13 -3 12 -1 L 10 0 Q 13 0 12 2 L 10 3 Q 12 4 10 6 L 8 7 Q 9 9 6 10 H -2 L -6 7 Z", W_GLYPH, PAPER),
      path("M 3 0 H 10 M 3 3 H 10 M 2 6 H 8", W_GLYPH, "none"),
      `</g>`
    ],
  },
  {
    id: "business-rule-task-marker", title: "Business Rule task marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.19",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "The exemplar's ruled table with a dark header identifies Business Rule execution. The engine has no Business Rule task keyword.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-44 -24)">`,
      `<rect x="-10" y="-9" width="21" height="18" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<rect x="-10" y="-9" width="21" height="5" fill="${INK}"/>`,
      path("M -4 -4 v 13 M -10 2 h 21", W_GLYPH, "none"),
      `</g>`
    ],
  },
  {
    id: "script-task-marker", title: "Script task marker",
    engine: null, dsl: ["task script \"…\""],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.20",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "The exemplar's curled scroll and three writing lines occupy the upper-left slot, distinguishing an executed Script task. The accepted task body and glyph weight are retained.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-44 -24)">`,
      path("M -6 -10 h 15 q -4 3 -2 6 l -3 14 h -15 q 4 -3 2 -6 l 3 -11 q -1 -3 0 -3 Z", W_GLYPH, PAPER),
      path("M -4 -5 h 9 M -5 0 h 9 M -6 5 h 9", W_GLYPH, "none"),
      `</g>`
    ],
  },
  {
    id: "collapsed-subprocess-marker", title: "Collapsed subprocess marker",
    engine: null, dsl: ["subprocess \"…\"", "subprocess \"…\" collapsed"],
    standard: "OMG BPMN 2.0.2 §10.3.5, Fig. 10.25",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A 14-unit boxed plus sits at the bottom centre of the activity, exactly as in the exemplar. It indicates subprocess content that is hidden in this view.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<rect x="-7" y="23" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 30 h 8 M 0 26 v 8", W_GLYPH, "none")
    ],
  },
  {
    id: "expanded-subprocess", title: "Expanded subprocess",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.5, Fig. 10.26",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "An enlarged rounded container encloses a start, a full-size task and an end with sequence flows, so the internal process is visible. There is no collapsed plus, and the engine cannot express the nested process.",
    draw: () => [
      `<rect x="-85" y="-116" width="170" height="232" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(0 -80)">`,
      circle(18, W_SHAPE, ""),
      `</g>`,
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M 0 -62 V -52", W_FLOW, "none"),
      `<g transform="translate(0 0) rotate(90)">`,
      headRight(-42, 0),
      `</g>`,
      path("M 0 42 V 52", W_FLOW, "none"),
      `<g transform="translate(0 0) rotate(90)">`,
      headRight(62, 0),
      `</g>`,
      `<g transform="translate(0 80)">`,
      circle(18, W_END),
      `</g>`
    ],
  },
  {
    id: "call-activity-border", title: "Call Activity border",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.6, Figs. 10.39–10.41",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A thick rounded border distinguishes invocation of reusable work from an ordinary activity. It reuses the exemplar's 3.2 end-event weight; the engine has no Call Activity form.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_END}"/>`
    ],
  },
  {
    id: "standard-loop-marker", title: "Standard loop marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.8, Figs. 10.46–10.47",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A circular arrow at the bottom centre marks a standard loop on the activity. The engine ignores trailing repetition keywords and cannot express this marker.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(0 30)">`,
      path("M 5 3 A 6 6 0 1 1 5 -3", W_GLYPH, "none"),
      path("M 1 -3 H 5 V -7", W_GLYPH, "none"),
      `</g>`
    ],
  },
  {
    id: "parallel-multi-instance-marker", title: "Parallel multi-instance marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.8, Fig. 10.48",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Three vertical bars at the bottom centre mark parallel multi-instance work, using the exemplar's bar spacing and weight. The engine cannot express this marker.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(0 30)">`,
      path("M -5 -5 v 10 M 0 -5 v 10 M 5 -5 v 10", W_SHAPE, "none"),
      `</g>`
    ],
  },
  {
    id: "sequential-multi-instance-marker", title: "Sequential multi-instance marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.8, Fig. 10.49",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "Three horizontal bars at the bottom centre mark sequential multi-instance work. Their orientation distinguishes them from parallel instances, and the engine cannot express this marker.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(0 30)">`,
      path("M -5 -5 h 10 M -5 0 h 10 M -5 5 h 10", W_SHAPE, "none"),
      `</g>`
    ],
  },
  {
    id: "inclusive-gateway", title: "Inclusive gateway",
    engine: null, dsl: ["gateway or"],
    standard: "OMG BPMN 2.0.2 §10.6.3, Fig. 10.108",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A circle inside the accepted gateway diamond marks inclusive branching or merging. Its 2.4 outline matches the exemplar's exclusive marker weight.",
    draw: () => [
      diamond(),
      `<circle cx="0" cy="0" r="10" fill="none" stroke="${INK}" stroke-width="2.4"/>`
    ],
  },
  {
    id: "event-based-gateway", title: "Ordinary event-based gateway",
    engine: null, dsl: ["gateway event"],
    standard: "OMG BPMN 2.0.2 §10.6.6, Fig. 10.115",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A pentagon inside two concentric circles identifies the ordinary event-based gateway. The engine draws a pentagon inside two concentric circles.",
    draw: () => [
      diamond(),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<circle cx="0" cy="0" r="11" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -7 L 6.66 -2.16 L 4.11 5.66 H -4.11 L -6.66 -2.16 Z", W_GLYPH, "none")
    ],
  },
  {
    id: "conditional-flow-marker", title: "Conditional-flow marker",
    engine: null, dsl: ["A --? \"…\" --> B", "A --?--> B"],
    standard: "OMG BPMN 2.0.2 §8.4.13, Fig. 8.33",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A hollow diamond touches the activity boundary at the start of a 120-unit sequence flow. The engine paints the hollow diamond after the activity so it remains visible, and omits it on gateway-origin flows.",
    draw: () => [
      `<rect x="-65" y="-144" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M 0 -46 V 50", W_FLOW),
      path("M 0 -60 L 5 -53 L 0 -46 L -5 -53 Z", W_GLYPH, PAPER),
      `<polygon points="-4.5,50 0,60 4.5,50" fill="${INK}" stroke="${INK}" stroke-width="${W_GLYPH}" stroke-linejoin="round"/>`,
    ],
  },
  {
    id: "association", title: "Undirected association",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §8.4.1, Fig. 8.9",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A 120-unit dotted sample represents an undirected association, using the exemplar's round dots. The engine cannot express association lines.",
    draw: () => [
      path("M -60 0 H 60", W_FLOW, "none", " stroke-dasharray=\"1 5\" stroke-linecap=\"round\"")
    ],
  },
  {
    id: "directed-association", title: "Directed association / Data Association",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §8.4.1, Fig. 8.11; §10.4.1, Fig. 10.65",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "An open V head terminates the exemplar's dotted association line, identifying direction without the filled head of a sequence flow. The same graphic covers Data Association; neither form is expressible in the engine.",
    draw: () => [
      path("M -60 0 H 60", W_FLOW, "none", " stroke-dasharray=\"1 5\" stroke-linecap=\"round\""),
      path("M 50 -4.5 L 60 0 L 50 4.5", W_FLOW, "none")
    ],
  },
  {
    id: "data-object", title: "Data Object",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.4.1, Fig. 10.52",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "A 42 by 54 document with a 12-unit folded corner copies the exemplar's Data Object. The engine has no data-object declaration.",
    draw: () => [
      path("M -21 -27 H 9 L 21 -15 V 27 H -21 Z M 9 -27 V -15 H 21", W_SHAPE, PAPER)
    ],
  },
  {
    id: "data-collection-marker", title: "Data collection marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.4.1, Fig. 10.53",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "Three vertical bars at the bottom of the exemplar's folded document identify a collection of data items. Placement on a data shape distinguishes this from activity multi-instance, and the engine cannot express it.",
    draw: () => [
      path("M -21 -27 H 9 L 21 -15 V 27 H -21 Z M 9 -27 V -15 H 21", W_SHAPE, PAPER),
      `<g transform="translate(0 18)">`,
      path("M -5 -5 v 10 M 0 -5 v 10 M 5 -5 v 10", W_SHAPE, "none"),
      `</g>`
    ],
  },
  {
    id: "data-input-marker", title: "Data Input marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.4.1, Fig. 10.58",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A hollow arrow at the top left of a Data Object identifies Data Input. The engine cannot express this data marker.",
    draw: () => [
      path("M -21 -27 H 9 L 21 -15 V 27 H -21 Z M 9 -27 V -15 H 21", W_SHAPE, PAPER),
      path("M -16 -18 H -9 V -21 L -3 -16 L -9 -11 V -14 H -16 Z", W_GLYPH, PAPER)
    ],
  },
  {
    id: "data-output-marker", title: "Data Output marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.4.1, Fig. 10.60",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A filled arrow at the top left of a Data Object identifies Data Output. The engine cannot express this data marker.",
    draw: () => [
      path("M -21 -27 H 9 L 21 -15 V 27 H -21 Z M 9 -27 V -15 H 21", W_SHAPE, PAPER),
      path("M -16 -18 H -9 V -21 L -3 -16 L -9 -11 V -14 H -16 Z", W_GLYPH, INK)
    ],
  },
  {
    id: "data-store", title: "Data Store",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.4.1, Fig. 10.54",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "The exemplar's 58-unit cylinder has three stacked top rims, identifying persistent storage beyond a process instance. The engine cannot express Data Stores.",
    draw: () => [
      path("M -29 -17 C -29 -26.333 29 -26.333 29 -17 V 17 C 29 26.333 -29 26.333 -29 17 Z", W_SHAPE, PAPER),
      path("M -29 -17 C -29 -7.667 29 -7.667 29 -17 M -29 -12 C -29 -2.667 29 -2.667 29 -12 M -29 -7 C -29 2.333 29 2.333 29 -7", W_GLYPH, "none")
    ],
  },
  {
    id: "text-annotation", title: "Text Annotation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §8.4.1, Fig. 8.16",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: true, tier: 2, usageUsers: null,
    notes: "An open left bracket accompanies explanatory text, retaining the exemplar's 64-unit bracket height and 14-unit annotation type. The engine has no Text Annotation declaration.",
    draw: () => [
      path("M -46 -32 H -58 V 32 H -46", W_SHAPE, "none"),
      `<text x="8" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="14" font-weight="400" text-anchor="middle" fill="${INK}">Review note</text>`
    ],
  },
  {
    id: "group", title: "Group",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §8.4.1, Fig. 8.13",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 2, usageUsers: null,
    notes: "A transparent rounded dash-dot enclosure groups the task without changing process flow or ownership. The engine cannot express Group artifacts.",
    draw: () => [
      `<rect x="-81" y="-58" width="162" height="116" rx="10" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}" stroke-dasharray="7 5 1 5"/>`,
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`
    ],
  },
  {
    id: "non-interrupting-start-outline", title: "Non-interrupting event-subprocess start outline",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.2, Table 10.86",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A dashed single start ring marks a non-interrupting event-subprocess start; the message trigger gives a legal example rather than an unsupported None start. The engine cannot express this outline or event-subprocess ownership.",
    draw: () => [
      circle(18, W_SHAPE, " stroke-dasharray=\"4 3\""),
      ...envelope(0, 0, false)
    ],
  },
  {
    id: "interrupting-event-subprocess-start", title: "Interrupting event-subprocess start",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.2, Table 10.86",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A solid single Message Start ring appears inside a dotted expanded event subprocess, showing an interrupting handler in its required scope. The engine cannot express event subprocesses or this containment.",
    draw: () => [
      `<rect x="-85" y="-116" width="170" height="232" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}" stroke-dasharray="1 5" stroke-linecap="round"/>`,
      `<g transform="translate(0 -80)">`,
      circle(18, W_SHAPE, ""),
      ...envelope(0, 0, false),
      `</g>`,
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M 0 -62 V -52", W_FLOW, "none"),
      `<g transform="translate(0 0) rotate(90)">`,
      headRight(-42, 0),
      `</g>`,
      path("M 0 42 V 52", W_FLOW, "none"),
      `<g transform="translate(0 0) rotate(90)">`,
      headRight(62, 0),
      `</g>`,
      `<g transform="translate(0 80)">`,
      circle(18, W_END),
      `</g>`
    ],
  },
  {
    id: "escalation-catch-marker", title: "Escalation catch glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.81",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A hollow upward notched arrowhead identifies the catching Escalation trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -9 L 8 9 L 0 2 L -8 9 Z", W_GLYPH, PAPER)
    ],
  },
  {
    id: "escalation-throw-marker", title: "Escalation throw glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.81",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A filled upward notched arrowhead identifies the throwing Escalation trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -9 L 8 9 L 0 2 L -8 9 Z", W_GLYPH, INK)
    ],
  },
  {
    id: "cancel-catch-marker", title: "Cancel catch glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.74",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A hollow X identifies the catching Cancel trigger. The catch is attached to a double-bordered transaction, the scope required for Cancel. The engine cannot express this trigger.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<rect x="-61" y="-38" width="122" height="76" rx="7" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<g transform="translate(-35 42)">`,
      `<circle cx="0" cy="0" r="16" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<circle cx="0" cy="0" r="12" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -6 -7.5 L 0 -2.25 L 6 -7.5 L 7.5 -6 L 2.25 0 L 7.5 6 L 6 7.5 L 0 2.25 L -6 7.5 L -7.5 6 L -2.25 0 L -7.5 -6 Z", W_GLYPH, PAPER),
      `</g>`
    ],
  },
  {
    id: "cancel-throw-marker", title: "Cancel throw glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.74",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A filled X identifies the throwing Cancel trigger. The End event is inside a double-bordered transaction, the scope required for Cancel. The engine cannot express this trigger.",
    draw: () => [
      `<rect x="-40" y="-40" width="80" height="80" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<rect x="-36" y="-36" width="72" height="72" rx="7" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      circle(18, W_END, ""),
      path("M -8 -10 L 0 -3 L 8 -10 L 10 -8 L 3 0 L 10 8 L 8 10 L 0 3 L -8 10 L -10 8 L -3 0 L -10 -8 Z", W_GLYPH, INK)
    ],
  },
  {
    id: "compensation-catch-marker", title: "Compensation catch glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.75",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A hollow pair of rewind triangles identifies the catching Compensation trigger. It is attached as a boundary catch rather than an ordinary in-flow wait. The engine cannot express this trigger.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-35 42)">`,
      `<circle cx="0" cy="0" r="16" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<circle cx="0" cy="0" r="12" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -5.1 L -8.5 0 L 0 5.1 Z M 8.5 -5.1 L 0 0 L 8.5 5.1 Z", W_GLYPH, PAPER),
      `</g>`
    ],
  },
  {
    id: "compensation-throw-marker", title: "Compensation throw glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.75",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A filled pair of rewind triangles identifies the throwing Compensation trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -6 L -10 0 L 0 6 Z M 10 -6 L 0 0 L 10 6 Z", W_GLYPH, INK)
    ],
  },
  {
    id: "link-catch-marker", title: "Link catch glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.83",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A hollow right-pointing arrow identifies the catching Link trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -10 -4 H 1 V -9 L 10 0 L 1 9 V 4 H -10 Z", W_GLYPH, PAPER)
    ],
  },
  {
    id: "link-throw-marker", title: "Link throw glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.83",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A filled right-pointing arrow identifies the throwing Link trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -10 -4 H 1 V -9 L 10 0 L 1 9 V 4 H -10 Z", W_GLYPH, INK)
    ],
  },
  {
    id: "multiple-catch-marker", title: "Multiple catch glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.90",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A hollow pentagon identifies the catching Multiple trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -10 L 9.51 -3.09 L 5.88 8.09 H -5.88 L -9.51 -3.09 Z", W_GLYPH, PAPER)
    ],
  },
  {
    id: "multiple-throw-marker", title: "Multiple throw glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.90",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A filled pentagon identifies the throwing Multiple trigger. The engine cannot express this trigger.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -10 L 9.51 -3.09 L 5.88 8.09 H -5.88 L -9.51 -3.09 Z", W_GLYPH, INK)
    ],
  },
  {
    id: "parallel-multiple-marker", title: "Parallel Multiple catch glyph",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.5.5, Fig. 10.92 (draft cited Table 10.93)",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An outlined plus in a catching intermediate ring identifies Parallel Multiple, which waits for every configured trigger. The engine cannot express it; the draft's Table 10.93 reference is corrected to the notation in Figure 10.92.",
    draw: () => [
      circle(18, W_SHAPE, ""),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -3 -10 H 3 V -3 H 10 V 3 H 3 V 10 H -3 V 3 H -10 V -3 H -3 Z", W_GLYPH, PAPER)
    ],
  },
  {
    id: "event-subprocess-border", title: "Event subprocess border",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.5, Figs. 10.30–10.31",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A dotted rounded border and bottom boxed plus show a collapsed event subprocess. This border-only sample leaves the trigger slot to event-subprocess-trigger-adornment; the engine cannot express either part.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}" stroke-dasharray="1 5" stroke-linecap="round"/>`,
      `<rect x="-7" y="23" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 30 h 8 M 0 26 v 8", W_GLYPH, "none")
    ],
  },
  {
    id: "event-subprocess-trigger-adornment", title: "Collapsed event-subprocess trigger adornment",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.5, Fig. 10.30",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A miniature Message Start event occupies the upper-left slot of a collapsed dotted event subprocess. Its single solid ring indicates an interrupting trigger, and the engine cannot express the adornment.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}" stroke-dasharray="1 5" stroke-linecap="round"/>`,
      `<rect x="-7" y="23" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 30 h 8 M 0 26 v 8", W_GLYPH, "none"),
      `<g transform="translate(-44 -24)">`,
      `<circle cx="0" cy="0" r="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<rect x="-6" y="-4" width="12" height="8" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -5 -3 L 0 1 L 5 -3", W_GLYPH, "none"),
      `</g>`
    ],
  },
  {
    id: "transaction-border", title: "Transaction border",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.5, Figs. 10.33–10.34",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two rounded outlines enclose a collapsed subprocess, distinguishing a transaction from an ordinary subprocess or thick-bordered Call Activity. The engine cannot express this border.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<rect x="-61" y="-38" width="122" height="76" rx="7" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      `<rect x="-7" y="21" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 28 h 8 M 0 24 v 8", W_GLYPH, "none")
    ],
  },
  {
    id: "ad-hoc-marker", title: "Ad-hoc subprocess marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.5, Figs. 10.35–10.36",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A tilde sits beside the bottom boxed plus of a collapsed subprocess, identifying ad-hoc ordering of its work. The engine cannot express the tilde marker.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M -19 31 C -16 22 -11 38 -8 29", W_SHAPE, "none"),
      `<g transform="translate(9 0)">`,
      `<rect x="-7" y="23" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 30 h 8 M 0 26 v 8", W_GLYPH, "none"),
      `</g>`
    ],
  },
  {
    id: "compensation-activity-marker", title: "Compensation activity marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.9; §10.7.1, Fig. 10.121",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Hollow rewind triangles at the bottom centre identify a compensation activity, rather than a catching event. The engine cannot express this activity marker.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(0 30)">`,
      path("M 0 -6 L -10 0 L 0 6 Z M 10 -6 L 0 0 L 10 6 Z", W_GLYPH, PAPER),
      `</g>`
    ],
  },
  {
    id: "instantiating-receive-marker", title: "Instantiating Receive task marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.3.3, Fig. 10.16",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A hollow envelope enclosed by a circle in the task's upper-left slot identifies a Receive task that instantiates the process. The engine has no instantiating Receive form.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<g transform="translate(-44 -24)">`,
      `<circle cx="0" cy="0" r="14" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      ...envelope(0, 0, false),
      `</g>`
    ],
  },
  {
    id: "exclusive-gateway-unmarked", title: "Exclusive gateway without X",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.6.2, Fig. 10.105",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The accepted gateway diamond is left empty, the standard's permitted alternative to an X-marked exclusive gateway. The engine always draws the X and cannot request this presentation.",
    draw: () => [
      diamond()
    ],
  },
  {
    id: "complex-gateway", title: "Complex gateway",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.6.5, Fig. 10.113",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An eight-spoke asterisk distinguishes the Complex gateway within the accepted diamond. It uses the exemplar's 2.4 gateway-marker weight; the engine has no Complex gateway form.",
    draw: () => [
      diamond(),
      path("M -10 0 H 10 M 0 -10 V 10 M -7 -7 L 7 7 M 7 -7 L -7 7", 2.4, "none")
    ],
  },
  {
    id: "instantiating-exclusive-event-gateway", title: "Instantiating exclusive event-based gateway",
    engine: null, dsl: ["gateway event"],
    standard: "OMG BPMN 2.0.2 §10.6.6, Fig. 10.118",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A single circle surrounding a pentagon identifies the instantiating exclusive event-based gateway. The engine has no instantiating exclusive gateway selection; gateway event draws the ordinary double-circle form.",
    draw: () => [
      diamond(),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M 0 -10 L 9.51 -3.09 L 5.88 8.09 H -5.88 L -9.51 -3.09 Z", W_GLYPH, "none")
    ],
  },
  {
    id: "instantiating-parallel-event-gateway", title: "Instantiating parallel event-based gateway",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.6.6, Fig. 10.119",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A single circle surrounding a plus identifies the instantiating parallel event-based gateway. The engine cannot express this gateway form.",
    draw: () => [
      diamond(),
      `<circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -8 0 H 8 M 0 -8 V 8", 2.4, "none")
    ],
  },
  {
    id: "bidirectional-association", title: "Bidirectional association",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §8.4.1, Table 8.20, `associationDirection=Both`",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Open V heads at both ends of a dotted line show associationDirection Both. The engine cannot express bidirectional associations.",
    draw: () => [
      path("M -60 0 H 60", W_FLOW, "none", " stroke-dasharray=\"1 5\" stroke-linecap=\"round\""),
      path("M -50 -4.5 L -60 0 L -50 4.5 M 50 -4.5 L 60 0 L 50 4.5", W_FLOW, "none")
    ],
  },
  {
    id: "nested-lane", title: "Nested lane subdivision",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §10.8, Fig. 10.125",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Lane B is subdivided into B1 and B2 while Lane A stays whole, using the exemplar's structural rules and name-band widths. The engine cannot express nested lanes.",
    draw: () => [
      `<rect x="-110" y="-100" width="220" height="200" fill="${PAPER}" stroke="#A8B1B5" stroke-width="1"/>`,
      `<rect x="-110" y="-100" width="38" height="200" fill="#F0F3F4" stroke="#A8B1B5" stroke-width="1"/>`,
      `<g transform="translate(-91 0) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Pool</text>`,
      `</g>`,
      `<rect x="-72" y="-100" width="38" height="200" fill="#F0F3F4" stroke="#A8B1B5" stroke-width="1"/>`,
      `<path d="M -72 0 H 110" fill="none" stroke="#A8B1B5" stroke-width="1"/>`,
      `<g transform="translate(-53 -50) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Lane A</text>`,
      `</g>`,
      `<g transform="translate(-53 50) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Lane B</text>`,
      `</g>`,
      `<rect x="-34" y="0" width="38" height="100" fill="#F0F3F4" stroke="#A8B1B5" stroke-width="1"/>`,
      `<path d="M -34 50 H 110" fill="none" stroke="#A8B1B5" stroke-width="1"/>`,
      `<g transform="translate(-15 25) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">B1</text>`,
      `</g>`,
      `<g transform="translate(-15 75) rotate(-90)">`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">B2</text>`,
      `</g>`
    ],
  },
  {
    id: "participant-multiplicity-marker", title: "Participant multiplicity marker",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §9.3.1, Fig. 9.8",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Three vertical bars sit at the bottom centre of a black-box pool, indicating multiple instances of that participant. The engine cannot express participant multiplicity.",
    draw: () => [
      `<rect x="-110" y="-32" width="220" height="64" fill="${PAPER}" stroke="#A8B1B5" stroke-width="1"/>`,
      `<text x="0" y="5" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="${INK}">Participant</text>`,
      `<g transform="translate(0 22)">`,
      path("M -5 -5 v 10 M 0 -5 v 10 M 5 -5 v 10", W_SHAPE, "none"),
      `</g>`
    ],
  },
  {
    id: "initiating-message", title: "Initiating Message",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §8.4.11, Fig. 8.26; §9.4, Fig. 9.12",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An unshaded envelope decorates a message-flow sample, identifying the initiating message. The message-flow context distinguishes it from a catching event trigger. The engine cannot express attached Message envelopes.",
    draw: () => [
      path("M -56 0 H 50", W_FLOW, "none", " stroke-dasharray=\"7 5\""),
      `<circle cx="-60" cy="0" r="4" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      headRight(60, 0, PAPER),
      `<rect x="-10" y="-7" width="20" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -9 -6 L 0 1 L 9 -6", W_GLYPH, "none")
    ],
  },
  {
    id: "non-initiating-message", title: "Non-initiating Message",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §8.4.11, Figs. 8.27–8.28",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A lightly shaded envelope decorates a message-flow sample, identifying the non-initiating reply. The fill uses the exemplar's Band colour, distinct from the solid ink of a throwing event. The engine cannot express attached Message envelopes.",
    draw: () => [
      path("M -56 0 H 50", W_FLOW, "none", " stroke-dasharray=\"7 5\""),
      `<circle cx="-60" cy="0" r="4" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      headRight(60, 0, PAPER),
      `<rect x="-10" y="-7" width="20" height="14" rx="0" fill="#F0F3F4" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -9 -6 L 0 1 L 9 -6", W_GLYPH, "none")
    ],
  },
  {
    id: "conversation", title: "Conversation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §9.5.2, Fig. 9.23",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A thin-bordered hexagon identifies a Conversation. The engine cannot express Conversation nodes.",
    draw: () => [
      path("M -30 0 L -15 -24 H 15 L 30 0 L 15 24 H -15 Z", W_SHAPE, PAPER)
    ],
  },
  {
    id: "sub-conversation", title: "Sub-Conversation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §9.5.3, Fig. 9.24",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A thin-bordered hexagon with a boxed plus identifies a collapsed Sub-Conversation. The engine cannot express Conversation nodes.",
    draw: () => [
      path("M -30 0 L -15 -24 H 15 L 30 0 L 15 24 H -15 Z", W_SHAPE, PAPER),
      `<rect x="-7" y="6" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 13 h 8 M 0 9 v 8", W_GLYPH, "none")
    ],
  },
  {
    id: "call-conversation", title: "Call Conversation",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §9.5.4, Fig. 9.25",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A thick-bordered hexagon identifies a Call Conversation invoking a Global Conversation. The engine cannot express Conversation nodes.",
    draw: () => [
      path("M -30 0 L -15 -24 H 15 L 30 0 L 15 24 H -15 Z", W_END, PAPER)
    ],
  },
  {
    id: "call-collaboration", title: "Call Conversation invoking Collaboration",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §9.5.4, Fig. 9.26",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A thick-bordered hexagon with a boxed plus identifies a Call Conversation invoking a Collaboration. The engine cannot express Conversation nodes.",
    draw: () => [
      path("M -30 0 L -15 -24 H 15 L 30 0 L 15 24 H -15 Z", W_END, PAPER),
      `<rect x="-7" y="6" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 13 h 8 M 0 9 v 8", W_GLYPH, "none")
    ],
  },
  {
    id: "conversation-link", title: "Conversation Link",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §9.5.6, Fig. 9.27",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Two thin parallel lines without arrowheads connect a Conversation hexagon to a participant rectangle. The engine cannot express Conversation Links.",
    draw: () => [
      path("M -100 0 L -85 -24 H -55 L -40 0 L -55 24 H -85 Z", W_SHAPE, PAPER),
      path("M -40 -2 H 80 M -40 2 H 80", W_GLYPH, "none"),
      `<rect x="80" y="-32" width="38" height="64" fill="${PAPER}" stroke="#A8B1B5" stroke-width="1"/>`
    ],
  },
  {
    id: "call-conversation-link", title: "Call Conversation Link",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §9.5.6, Fig. 9.30",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Branched double lines connect a Call Collaboration to participant rectangles, with names identifying participants in the called collaboration as in Figure 9.30. The engine cannot express these mapped Conversation Links.",
    draw: () => [
      path("M -95 0 L -80 -24 H -50 L -35 0 L -50 24 H -80 Z", W_END, PAPER),
      `<g transform="translate(-65 0)">`,
      `<rect x="-7" y="6" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 13 h 8 M 0 9 v 8", W_GLYPH, "none"),
      `</g>`,
      path("M -35 -2 H -7 V -49 H 73 M -35 2 H -7 V 49 H 73 M 73 -45 H -3 V 45 H 73", W_GLYPH, "none"),
      `<rect x="73" y="-79" width="38" height="64" fill="${PAPER}" stroke="#A8B1B5" stroke-width="1"/>`,
      `<rect x="73" y="15" width="38" height="64" fill="${PAPER}" stroke="#A8B1B5" stroke-width="1"/>`,
      `<text x="35" y="-57" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="14" font-weight="400" text-anchor="middle" fill="${INK}">Buyer</text>`,
      `<text x="35" y="68" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="14" font-weight="400" text-anchor="middle" fill="${INK}">Seller</text>`
    ],
  },
  {
    id: "choreography-task", title: "Choreography Task",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §7.3.2, Table 7.2",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "The activity has an unshaded initiating participant band above and a Band-colour non-initiating participant band below, identifying a Choreography Task. Merged ids initiating-participant-band and non-initiating-participant-band are shown together here because separate contextual samples would duplicate this drawing. The engine cannot express Choreography activities or participant bands.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M -65 20 H 65 V 32 Q 65 42 55 42 H -55 Q -65 42 -65 32 Z", W_GLYPH, "#F0F3F4"),
      path("M -65 -20 H 65 M -65 20 H 65", W_GLYPH, "none"),
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}"/>`
    ],
  },
  {
    id: "collapsed-sub-choreography", title: "Collapsed Sub-Choreography",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §7.3.2, Table 7.2",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "Participant bands and a boxed plus in the central activity region identify a collapsed Sub-Choreography. The engine cannot express this form.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M -65 20 H 65 V 32 Q 65 42 55 42 H -55 Q -65 42 -65 32 Z", W_GLYPH, "#F0F3F4"),
      path("M -65 -20 H 65 M -65 20 H 65", W_GLYPH, "none"),
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      `<rect x="-7" y="1" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 8 h 8 M 0 4 v 8", W_GLYPH, "none")
    ],
  },
  {
    id: "expanded-sub-choreography", title: "Expanded Sub-Choreography",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §7.3.2, Table 7.2",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "An enlarged participant-banded container encloses a full-size Choreography Task with no collapsed plus. The engine cannot express nested Choreography content.",
    draw: () => [
      `<rect x="-85" y="-94" width="170" height="188" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M -85 66 H 85 V 84 Q 85 94 75 94 H -75 Q -85 94 -85 84 Z", W_GLYPH, "#F0F3F4"),
      path("M -85 -66 H 85 M -85 66 H 85", W_GLYPH, "none"),
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_SHAPE}"/>`,
      path("M -65 20 H 65 V 32 Q 65 42 55 42 H -55 Q -65 42 -65 32 Z", W_GLYPH, "#F0F3F4"),
      path("M -65 -20 H 65 M -65 20 H 65", W_GLYPH, "none"),
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="none" stroke="${INK}" stroke-width="${W_SHAPE}"/>`
    ],
  },
  {
    id: "call-choreography-border", title: "Call Choreography border",
    engine: null, dsl: ["— (not expressible)"],
    standard: "OMG BPMN 2.0.2 §7.3.2, Table 7.2",
    sourceUrl: "https://www.omg.org/spec/BPMN/2.0.2/PDF", inExemplar: false, tier: 3, usageUsers: null,
    notes: "A thick outer activity border surrounds participant bands and a collapsed plus, identifying a Call Choreography invoking reusable choreography. It reuses the exemplar's 3.2 weight, and the engine cannot express this form.",
    draw: () => [
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="${PAPER}" stroke="${INK}" stroke-width="${W_END}"/>`,
      path("M -65 20 H 65 V 32 Q 65 42 55 42 H -55 Q -65 42 -65 32 Z", W_GLYPH, "#F0F3F4"),
      path("M -65 -20 H 65 M -65 20 H 65", W_GLYPH, "none"),
      `<rect x="-65" y="-42" width="130" height="84" rx="10" fill="none" stroke="${INK}" stroke-width="${W_END}"/>`,
      `<rect x="-7" y="1" width="14" height="14" rx="0" fill="${PAPER}" stroke="${INK}" stroke-width="${W_GLYPH}"/>`,
      path("M -4 8 h 8 M 0 4 v 8", W_GLYPH, "none")
    ],
  },

];

await writeSet({
  type: "bpmn", variant: "collaboration", exemplar: "bpmn/collaboration",
  style: `OMG BPMN 2.0.2 notation in ink ${INK} on white. Flow-object outlines 1.6, flows 1.5, glyphs and markers 1.2. Events are r = 18 circles: start thin, intermediate with a second ring at r = 14, end at 3.2, non-interrupting dashed; trigger glyphs hollow for catching and filled for throwing. Tasks are 130 x 84 with 10-unit corners, type markers at top-left and loop / multi-instance markers at bottom centre. Gateways are diamonds of half-diagonal 24 with the X at 2.4 and the plus at 3. Sequence flows end in filled 10 x 9 arrowheads; message flows are dashed 7 / 5 with a hollow r = 4 source circle and hollow arrowhead; associations are dotted. Pools and lanes use rule #A8B1B5 at 1 with a #F0F3F4 name band.`,
}, SYMBOLS);
