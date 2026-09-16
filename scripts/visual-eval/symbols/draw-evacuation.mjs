// Draws the ISO evacuation safety-sign library (tiers 1–3) for the Symbols review page.
// Every constant is lifted from visual-eval/exemplars/evacuation/iso/ideal.svg:
// 24-unit plates with rx 2 placed at scale 1.25 on the plan (30 px), white
// knockout art with 2.05 limb strokes / 1.7 frame strokes / 1.4 hose strokes.
// Each pictogram follows the ISO 7010 registered image content (listed per sign
// below) with original geometry; nothing is traced from the standard's artwork.
// Output: visual-eval/symbols/evacuation/{<id>.svg, manifest.json}
import { mkdir, writeFile } from "node:fs/promises";

const OUT = new URL("../../../visual-eval/symbols/evacuation/", import.meta.url);
const SAFE = "#00843D"; // ISO 3864-1 safe condition green (exemplar)
const FIRE = "#C8102E"; // ISO 3864-1 fire equipment red (exemplar)
const MARKER = "#005387"; // exemplar location-marker blue
const W = "#fff";
const PLAN_SCALE = 1.25; // 24-unit plate -> 30 px on the exemplar plan
const PAD = 8;

const svgDoc = (title, width, height, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<title>${title}</title>\n${body}\n</svg>\n`;
const doc = (title, size, body) => svgDoc(title, size, size, body);
const plateDoc = (title, colour, art) =>
  doc(title, PAD * 2 + 24 * PLAN_SCALE,
    `<g transform="translate(${PAD} ${PAD}) scale(${PLAN_SCALE})">\n<rect x="0" y="0" width="24" height="24" rx="2" fill="${colour}"/>\n${art}\n</g>`);
// Sign plus supplementary arrow on one carrier: two 24-unit squares side by side (60 x 30 px).
// No divider: a line at the seam sits against the doorway and reads as a second door frame.
const comboDoc = (title, colour, art) =>
  svgDoc(title, PAD * 2 + 48 * PLAN_SCALE, PAD * 2 + 24 * PLAN_SCALE,
    `<g transform="translate(${PAD} ${PAD}) scale(${PLAN_SCALE})">\n<rect x="0" y="0" width="48" height="24" rx="2" fill="${colour}"/>\n${art}\n</g>`);
const mirror = (art, width = 24) => `<g transform="translate(${width} 0) scale(-1 1)">\n${art}\n</g>`;
const shift = (art, dx, dy = 0) => `<g transform="translate(${dx} ${dy})">\n${art}\n</g>`;

// E002: figure running right towards a doorway on the right (no threshold bar: not part of ISO 7010).
const runnerRight = `<circle cx="11.2" cy="5.3" r="2.2" fill="${W}"/>
<g fill="none" stroke="${W}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round">
<path d="M10.2 8.6 L8.4 12.9"/>
<path d="M8.4 12.9 L11.9 14.9 L11.5 19.8"/>
<path d="M8.4 12.9 L6.5 16.6 L3.6 18.2"/>
<path d="M10.1 9.2 L12.5 11.2 L14.8 10.2"/>
<path d="M9.8 9.2 L6.9 8.9 L5.0 10.9"/>
</g>`;
const doorwayRight = `<path d="M17.4 3.6 h4.9 v16.9 h-4.9" fill="none" stroke="${W}" stroke-width="1.7" stroke-linejoin="round"/>`;
const exitRight = runnerRight + "\n" + doorwayRight;
// Final-exit plan qualifier from the engine: a threshold below the doorway.
// Leave a clear green gap above the threshold at the accepted 30 px plate size.
const exitFinal = runnerRight + `
<path d="M17.4 3.6 h4.9 v15.3 h-4.9" fill="none" stroke="${W}" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M16.7 22 H22.3" fill="none" stroke="${W}" stroke-width="1.7" stroke-linecap="round"/>`;

// ISO 3864-3 directional arrow (pointing right), filled, with swept-back barbs.
const arrowRight = `<path d="M3.4 9.9 H13.4 L9.4 4.6 H13.6 L20.6 12 L13.6 19.4 H9.4 L13.4 14.1 H3.4 Z" fill="${W}"/>`;

const cross = `<rect x="9.4" y="4.4" width="5.2" height="15.2" rx="0.6" fill="${W}"/><rect x="4.4" y="9.4" width="15.2" height="5.2" rx="0.6" fill="${W}"/>`;
// Secondary first-aid cross in the top-right corner (E004, E010, E011, E012).
const smallCross = `<rect x="18.35" y="1.9" width="1.9" height="5.6" rx="0.3" fill="${W}"/><rect x="16.5" y="3.75" width="5.6" height="1.9" rx="0.3" fill="${W}"/>`;

// Flame shared by every F-series sign (same geometry, positioned per sign).
const FLAME = "M18.6 11.2 C20.9 13.3 21.6 15.6 21.1 17.6 C20.7 19.4 19.3 20.4 17.8 20.4 C16.1 20.4 14.8 19.1 14.9 17.3 C15.0 15.9 15.9 15.1 16.3 14.0 C17.0 14.9 17.1 15.7 17.0 16.5 C18.2 15.3 18.9 13.5 18.6 11.2 Z";
const flame = (dx, dy) => `<path transform="translate(${dx} ${dy})" d="${FLAME}" fill="${W}"/>`;

// F001: extinguisher with label and valve (exemplar parts, moved left), flame to its right.
const extinguisher = `<rect x="3.4" y="20.4" width="11.2" height="1.7" rx="0.7" fill="${W}"/>
<rect x="5.6" y="7.4" width="6.6" height="12.6" rx="1.7" fill="${W}"/>
<rect x="7.2" y="11.8" width="3.4" height="3.8" rx="0.4" fill="${FIRE}"/>
<rect x="7.4" y="4.6" width="3.0" height="3.0" fill="${W}"/>
<rect x="5.0" y="3.5" width="8.0" height="1.6" rx="0.7" fill="${W}"/>
<path d="M12.8 6.0 q3.0 1.2 2.6 4.6" fill="none" stroke="${W}" stroke-width="1.4" stroke-linecap="round"/>
<rect x="14.2" y="10.4" width="2.4" height="1.7" rx="0.5" fill="${W}"/>
${flame(0, 0)}`;

// F005: hand seen from above, index finger pressing the dot in a call-point square
// that is open at the bottom where the finger enters; flame on the right.
const callPoint = `<path d="M6.9 13.2 H3.4 V3.2 H13.4 V13.2 H10.1" fill="none" stroke="${W}" stroke-width="1.7" stroke-linejoin="round"/>
<circle cx="8.5" cy="8.2" r="1.9" fill="${W}"/>
<path d="M8.5 11.2 V16.4" fill="none" stroke="${W}" stroke-width="2.05" stroke-linecap="round"/>
<path d="M7.4 15.6 C7.4 14.6 8.2 14.2 9.0 14.4 C9.4 13.6 10.6 13.5 11.1 14.3 C11.6 13.7 12.8 13.8 13.1 14.7 C13.7 14.4 14.6 14.8 14.6 15.8 L14.6 18.6 C14.6 20.4 13.6 21.4 12.2 21.8 L12.2 23.0 H8.2 L8.2 21.4 C7.0 20.6 5.2 18.8 4.8 17.4 C4.5 16.5 5.4 15.9 6.1 16.5 L7.4 17.6 Z" fill="${W}"/>
${flame(0.2, -2.4)}`;

// E007: two figures and the head of a third in a group, four arrows from the corners pointing at them.
const cornerArrow = (x, y, deg) =>
  `<g transform="translate(${x} ${y}) rotate(${deg})"><path d="M0 0 H2.4" stroke="${W}" stroke-width="1.7" stroke-linecap="round"/><path d="M5.2 0 L2.0 -2.1 L2.0 2.1 Z" fill="${W}"/></g>`;
const assembly = `${cornerArrow(2.3, 2.3, 45)}
${cornerArrow(21.7, 2.3, 135)}
${cornerArrow(2.3, 21.7, -45)}
${cornerArrow(21.7, 21.7, -135)}
<circle cx="12" cy="7.3" r="1.6" fill="${W}"/>
<circle cx="9.4" cy="10.3" r="1.75" fill="${W}"/>
<circle cx="14.6" cy="10.3" r="1.75" fill="${W}"/>
<path d="M7.2 17.2 V14.6 C7.2 13.2 8.1 12.5 9.4 12.5 C10.7 12.5 11.6 13.2 11.6 14.6 V17.2 Z" fill="${W}"/>
<path d="M12.4 17.2 V14.6 C12.4 13.2 13.3 12.5 14.6 12.5 C15.9 12.5 16.8 13.2 16.8 14.6 V17.2 Z" fill="${W}"/>`;

// E010: heart with a lightning bolt in the middle (plate-colour cut-out), first-aid cross.
const aed = `<path d="M10.6 21.2 C8.2 19.0 3.0 15.6 3.0 10.8 C3.0 8.3 4.9 6.6 7.0 6.6 C8.6 6.6 9.9 7.5 10.6 8.8 C11.3 7.5 12.6 6.6 14.2 6.6 C16.3 6.6 18.2 8.3 18.2 10.8 C18.2 15.6 13.0 19.0 10.6 21.2 Z" fill="${W}"/>
<path d="M11.2 8.9 H13.6 L11.9 12.5 H14.0 L9.4 19.2 L10.5 14.4 H8.2 Z" fill="${SAFE}"/>
${smallCross}`;

// E004: telephone receiver in profile, first-aid cross. Drawn level, then tilted so the
// earpiece is upper left, the mouthpiece lower right and both cups face up-right.
const cup = (x0, x1) => `M${x0} 0.2 H${x1} V1.2 C${x1} 3.0 ${(x0 + x1) / 2 + 1.6} 3.8 ${(x0 + x1) / 2} 3.8 C${(x0 + x1) / 2 - 1.6} 3.8 ${x0} 3.0 ${x0} 1.2 Z`;
const handset = `<g transform="translate(10.4 13.4) rotate(-135)">
<path d="M-6.0 0.4 C-3.2 -2.4 3.2 -2.4 6.0 0.4" fill="none" stroke="${W}" stroke-width="2.4" stroke-linecap="round"/>
<path d="${cup(-9.2, -3.6)}" fill="${W}"/>
<path d="${cup(3.6, 9.2)}" fill="${W}"/>
</g>`;
const emergencyPhone = handset + "\n" + smallCross;

// F002: hose wound on the reel seen side-on (vertical turns), one turn hanging down to a
// nozzle, the reel's handwheel (circle with cross) on a line from the wall bar; flame.
const HOSE_TURNS = 5; // the registered sign has seven; the note below says why five are drawn
const hoseReel = (() => {
  const x0 = 11.0, x1 = 19.4, pitch = (x1 - x0) / (HOSE_TURNS - 1);
  const turns = Array.from({ length: HOSE_TURNS }, (_, i) => +(x0 + i * pitch).toFixed(2));
  return `<rect x="2.6" y="3.2" width="1.7" height="9.8" rx="0.5" fill="${W}"/>
<path d="M4.3 8.0 H11.0" fill="none" stroke="${W}" stroke-width="1.4"/>
<circle cx="7.4" cy="8.0" r="2.4" fill="${W}"/>
<path d="M5.9 8.0 H8.9 M7.4 6.5 V9.5" fill="none" stroke="${FIRE}" stroke-width="0.8"/>
<g fill="none" stroke="${W}" stroke-width="1.1" stroke-linecap="round">
${turns.map((x) => `<path d="M${x} 3.4 V11.2"/>`).join("\n")}
<path d="M${x0} 11.2 V16.8"/>
</g>
<path d="M9.8 16.4 H12.2 V17.6 L11.7 21.0 H10.3 L9.8 17.6 Z" fill="${W}"/>
${flame(0.2, 1.4)}`;
})();

// F004: fire helmet in profile facing right: dome with a comb on top and a badge at the front,
// sitting on a brim that runs long and low at the back; flame on the right.
const fireEquipment = `<g transform="translate(-0.6 0)">
<path d="M2.4 17.4 C3.6 15.6 5.0 14.2 7.0 14.2 H14.6 C15.3 14.2 15.5 14.9 15.1 15.4 L14.8 15.8 H7.4 C5.6 15.8 4.2 16.6 3.4 17.8 C3.1 18.2 2.1 17.9 2.4 17.4 Z" fill="${W}"/>
<path d="M5.6 13.5 C5.6 8.9 8.0 6.0 10.4 6.0 C12.8 6.0 14.4 8.8 14.4 12.8 V13.5 Z" fill="${W}"/>
<path d="M7.2 8.6 C8.2 5.4 12.0 4.7 13.4 7.6" fill="none" stroke="${W}" stroke-width="1.2" stroke-linecap="round"/>
<path d="M12.6 13.5 L12.1 9.8 C13.0 9.0 14.7 9.0 15.6 9.8 L15.1 13.5 Z" fill="${W}" stroke="${FIRE}" stroke-width="0.7" stroke-linejoin="round"/>
</g>
${flame(0.4, 0.6)}`;

// E011: eye above water rising from a shower head, first-aid cross.
const eyewash = `<g transform="translate(0.8 0)">
<path d="M3.6 8.6 C6.2 5.0 13.0 5.0 15.6 8.6 C13.0 12.2 6.2 12.2 3.6 8.6 Z" fill="none" stroke="${W}" stroke-width="1.4" stroke-linejoin="round"/>
<circle cx="9.6" cy="8.6" r="2.2" fill="${W}"/>
<g fill="none" stroke="${W}" stroke-width="1.4" stroke-linecap="round">
<path d="M7.4 16.0 L6.4 13.4"/><path d="M9.6 15.8 V13.0"/><path d="M11.8 16.0 L12.8 13.4"/>
</g>
<path d="M6.4 16.6 H12.8 L11.2 18.8 H8.0 Z" fill="${W}"/>
<rect x="8.8" y="18.4" width="1.6" height="3.4" fill="${W}"/>
</g>
${smallCross}`;

// E012: figure under water falling from a shower head, first-aid cross.
const safetyShower = `<path d="M3.4 2.8 H10.8 V4.2" fill="none" stroke="${W}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8.8 4.0 H12.8 L14.8 6.2 H6.8 Z" fill="${W}"/>
<g fill="none" stroke="${W}" stroke-width="1.4" stroke-linecap="round">
<path d="M7.6 7.6 L6.8 9.8"/><path d="M10.8 7.6 V8.1"/><path d="M14.0 7.6 L14.8 9.8"/>
</g>
<circle cx="10.8" cy="11.2" r="1.9" fill="${W}"/>
<rect x="9.0" y="13.6" width="3.6" height="4.6" rx="1.2" fill="${W}"/>
<g fill="none" stroke="${W}" stroke-width="2.05" stroke-linecap="round">
<path d="M9.2 14.2 L7.0 17.6"/><path d="M12.4 14.2 L14.6 17.6"/>
<path d="M9.9 17.6 L9.0 21.6"/><path d="M11.7 17.6 L12.6 21.6"/>
</g>
${smallCross}`;

const hereMarker = (() => {
  const r = 16.93, c = PAD + r;
  return doc("You are here (ISO 23601 location marker)", +(2 * c).toFixed(2),
    `<circle cx="${c}" cy="${c}" r="${r}" fill="${MARKER}"/>\n<circle cx="${c}" cy="${c}" r="9.83" fill="none" stroke="${W}" stroke-width="2.2"/>\n<circle cx="${c}" cy="${c}" r="3.55" fill="${W}"/>`);
})();


// Round 2: original geometry, retaining the accepted figure, runner, arrow,
// handset, small cross and flame wherever their registered content calls for them.
const standingFigure = safetyShower.slice(safetyShower.indexOf('<circle cx="10.8"'), safetyShower.lastIndexOf(smallCross));
const limbs = (d) => `<path d="${d}" fill="none" stroke="${W}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"/>`;
const frame = (d) => `<path d="${d}" fill="none" stroke="${W}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
const wheelchair = `<circle cx="10.8" cy="5.3" r="1.9" fill="${W}"/>
${limbs('M10.3 8.5 L11 13 H15 L18 18 H20 M11 10 H15')}
${frame('M8.3 11.2 A5 5 0 1 0 13.8 18.4')}`;
const refuge = `${cornerArrow(2.3, 2.3, 45)}${cornerArrow(21.7, 2.3, 135)}${cornerArrow(2.3, 21.7, -45)}${cornerArrow(21.7, 21.7, -135)}
<g transform="translate(3.6 4.2) scale(.69)">${wheelchair}</g>`;
const shelter = `${frame('M3 6 L7 3 H17 L21 6 V17 H3 Z')}
${[3.1, 7.2, 11.3, 15.4].map(x => `<g transform="translate(${x} 6.6) scale(.38 .52) translate(-5 -8)">${standingFigure}</g>`).join('\n')}
${frame('M3 21 H8 M16 21 H21')}
<path d="M9 18 H15 V20 Q15 22 12 23 Q9 22 9 20 Z" fill="${W}"/>`;
const stretcher = `<circle cx="4.5" cy="11.4" r="1.9" fill="${W}"/>
${limbs('M8 12 H12 L15 13 H19')}
${frame('M2.8 16 H21.2 M5 16 V19 M19 16 V19')}${smallCross}`;
const doctor = `<circle cx="9.4" cy="6.3" r="2.5" fill="${W}"/>
<path d="M3.4 21 V15 Q3.4 10.5 9.4 10.5 Q15.4 10.5 15.4 15 V21 Z" fill="${W}"/>
<path d="M6.6 11 V14.5 Q6.6 17.8 10.2 17.8 Q12.3 17.8 12.3 15.5 V14" fill="none" stroke="${SAFE}" stroke-width="1.4" stroke-linecap="round"/>
<circle cx="12.3" cy="13.6" r="1.25" fill="${SAFE}"/>${smallCross}`;
const breakGlass = `<path d="M15 2 L16.3 6 L20.5 3.5 L19 8 L23 9 L19 11.3 L21 15.5 L16.6 13.8 L15 18 L13.5 13.8 L10 16 L11.2 11.5 L7.7 9 L12 7.5 L10.5 3.8 L14 6 Z" fill="${W}"/>
<path d="M3 19 L17 7" stroke="${SAFE}" stroke-width="3.5"/>
${limbs('M3 19 L17 7')}
<path d="M3 12 L6 10 L8 11 L10 14 L9 17 L7 18 L5 22 H1.8 L3.6 17 L2 15 Z" fill="${W}" stroke="${SAFE}" stroke-width=".7" stroke-linejoin="round"/>`;
const windowRunner = `<g transform="translate(6.8 1.6) scale(.64)">${mirror(runnerRight)}</g>
${frame('M12 2 H22 V14 H12 V11')}`;
const windowLadder = `${windowRunner}${frame('M3 12 V22 M9 12 V22 M3 14 H9 M3 17 H9 M3 20 H9')}`;
const rescueWindow = `${windowRunner}
${frame('M3 18 L11 12 M5 20 L13 14 M5 17 L7 19 M8 15 L10 17')}
<path d="M9 18 H18 V15 H21 L23 18 V21 H9 Z" fill="${W}"/>
<circle cx="12" cy="21" r="1.7" fill="${W}" stroke="${SAFE}" stroke-width=".7"/>
<circle cx="20" cy="21" r="1.7" fill="${W}" stroke="${SAFE}" stroke-width=".7"/>`;
const doorPush = `${frame('M6 20 V3 H19 V20')}
<path d="M7.8 4.5 L14.5 7 V21 L7.8 18.5 Z" fill="${W}"/>
${frame('M20 13 C23 19 15 22 4.8 15')}
<path d="M2.2 15 L7.2 11.5 V14 H9 V16 H7.2 V18.5 Z" fill="${W}"/>`;
const doorSlide = `${frame('M2.5 3 H21.5 M2.5 21 H21.5')}
<rect x="5" y="5" width="8" height="14" fill="${W}"/>
<defs><clipPath id="door-arrow-outside"><rect x="13" y="5" width="10" height="14"/></clipPath></defs>
<g transform="translate(4 4) scale(.82 .67)">${arrowRight.replaceAll(W, SAFE)}</g>
<g clip-path="url(#door-arrow-outside)"><g transform="translate(4 4) scale(.82 .67)">${arrowRight}</g></g>`;
const fireLadder = `${frame('M3 21 L6 3 M12 21 L9 3 M5.7 5 H9.3 M5.2 8 H9.8 M4.7 11 H10.3 M4.2 14 H10.8 M3.7 17 H11.3 M3.2 20 H11.8')}${flame(.2, 0)}`;
const firePhone = `<g transform="translate(-1 -.6) scale(.85)">${handset}</g>${flame(.2, 0)}`;
// Unregistered inventory items are neutral legend labels, never coloured ISO signs.
const textLabel = (title, lines) => svgDoc(title, 92, 46,
  `<rect x="8" y="8" width="76" height="30" fill="#fff"/>\n` +
  lines.map((line, i) => `<text x="46" y="${21 + i * 11}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#000">${line}</text>`).join('\n'));
const noLift = doc('Do not use lift in the event of fire (ISO 7010 P020)', 46,
  `<g transform="translate(8 8) scale(1.25)"><circle cx="12" cy="12" r="12" fill="#fff"/>
<path d="M5 5.4 H15.5 V18.6 H5 Z" fill="none" stroke="#000" stroke-width="1.4"/>
<g transform="translate(2 3) scale(.55)">${standingFigure.replaceAll(W, '#000')}</g>
<g transform="translate(6 3) scale(.55)">${standingFigure.replaceAll(W, '#000')}</g>
<g transform="translate(6.5 1) scale(.65)">${flame(0, 0).replaceAll(W, '#000')}</g>
<circle cx="12" cy="12" r="10.6" fill="none" stroke="${FIRE}" stroke-width="2.8"/>
<path d="M4.5 4.5 L19.5 19.5" stroke="${FIRE}" stroke-width="2.8"/>
</g>`);
const flashingAlarm = `<path d="M3 18 H12 L11 10 Q10.7 7 7.5 7 Q4.3 7 4 10 Z" fill="${W}"/>
${frame('M2.5 20 H12.5 M7.5 2 V4 M1.8 5 L3.3 6.5 M13.2 5 L11.7 6.5')}${flame(.3, 0)}`;
const accessibleExit = `${mirror(`<g transform="translate(1 1) scale(.79)">${wheelchair}</g>`)}
${frame('M6 3 H2 V21 H6')}`;
const evacuationChair = `<g transform="translate(-1 0) scale(.65)">${runnerRight}</g>
${limbs('M8.5 6.6 L10.4 9.2')}
<circle cx="14.5" cy="7" r="1.8" fill="${W}"/>
${limbs('M13.4 10 L14 14 H17.4 L20 17 M13.6 11.5 H17')}
${frame('M11 9 L12 16 H17 M10 15 L15 19')}
<path d="M2 17 H6 V19.5 H11 V22 H22" fill="none" stroke="${W}" stroke-width="1.4" stroke-linejoin="round"/>
<circle cx="13" cy="17" r="1.5" fill="${W}"/><circle cx="13" cy="17" r=".55" fill="${SAFE}"/>`;
const fixedLadder = frame('M7 2.8 V21.2 M17 2.8 V21.2 M7 4.5 H17 M7 7.5 H17 M7 10.5 H17 M7 13.5 H17 M7 16.5 H17 M7 19.5 H17');

// Tier 3 continuation: registered image content, with original geometry on the
// same grid. Small details are omitted only where needed to keep 30 px legible.
const evacuationLift = `${frame('M3 6 H21 V18 H3 Z')}
<g transform="translate(4.1 5.1) scale(.61)">${wheelchair}</g>
<g transform="translate(12 2.9) scale(.24) rotate(-90) translate(-12 -12)">${arrowRight}</g>
<g transform="translate(12 21.1) scale(.24) rotate(90) translate(-12 -12)">${arrowRight}</g>`;
const fireBlanket = `<circle cx="8" cy="4.9" r="1.9" fill="${W}"/>
${limbs('M5.5 8 L3 9.4 M10.5 8 L13 9.4 M6 18 V21 M10 18 V21')}
<path d="M3.8 9 H12.2 V18.5 Q8 17 3.8 18.5 Z" fill="${W}"/>
${flame(.3, 0)}`;
const fireDoor = `<g transform="translate(.2 0) scale(.66 1)">${doorPush}</g>${flame(.3, 0)}`;
const firefightersLift = `${frame('M2.5 3 H14 V21 H2.5 Z')}
<g transform="translate(1.3 3.7) scale(.57)">${mirror(fireEquipment.slice(0, fireEquipment.indexOf(flame(.4, .6))))}</g>
${frame('M6.6 13 L5.2 15 H6.4 V17 H9.8 V13')}${flame(.3, 0)}`;
const wheeledExtinguisher = `<g transform="translate(.3 .8) scale(.82)">${extinguisher.slice(extinguisher.indexOf('<rect x="5.6"'), extinguisher.indexOf(flame(0, 0)))}</g>
${frame('M2.5 4 H4 L4 19 H12.8')}
<circle cx="5" cy="20" r="2.2" fill="${W}"/><circle cx="5" cy="20" r=".8" fill="${FIRE}"/>
${flame(.3, 0)}`;
const descentDevice = `${frame('M12 2 V10')}
<circle cx="7.8" cy="5.4" r="1.9" fill="${W}"/>
${limbs('M7.5 8.6 L6.6 13 L11 15 L10 20 M6.6 13 L4 17 L3 21 M8 9.1 L12 10 M7 9 L4.4 11.4')}
${frame('M5.5 12.2 L9 13.3 L10.2 10.5')}
<path d="M6.8 10 L8.4 11" stroke="${SAFE}" stroke-width="1.1"/>
<g transform="translate(18.2 13) scale(.52) rotate(90) translate(-12 -12)">${arrowRight}</g>`;
const evacuationMattress = `<path d="M2 15 H5 V18 H9 V21 H22" fill="none" stroke="${W}" stroke-width="1.4" stroke-linejoin="round"/>
<g transform="translate(1.5 7.2) rotate(17 7 8) scale(.55)">${stretcher.slice(0, stretcher.indexOf(frame('M2.8 16 H21.2 M5 16 V19 M19 16 V19')))}
<path d="M2 16 H22" stroke="${W}" stroke-width="2.4" stroke-linecap="round"/></g>
<g transform="translate(10.5 7.2) scale(.59)">${runnerRight}</g>
${frame('M13.5 17 L14.5 13')}${smallCross}`;
const evacuationEquipment = `<path d="M12 4 L15 3 Q16.5 7 18 3 L21 4 V9 L22 11 V21 H11 V11 L12 9 Z" fill="${W}"/>
<path d="M14 6 V20 M19 6 V20 M11 13 H22 M11 17 H22" stroke="${SAFE}" stroke-width="1.3"/>
<path d="M2.4 10 H5 L9 7 V17 L5 14 H2.4 Z M4 14 H6 L7 20 H4.5 Z" fill="${W}"/>`;
const firstAidResponder = `<circle cx="9.6" cy="5.1" r="2.4" fill="${W}"/>
<path d="M4.5 21 V13 H3 V18 H1.5 V12 Q1.5 9 5.5 9 H13.7 Q17.7 9 17.7 12 V18 H16.2 V13 H14.7 V21 Z" fill="${W}"/>
<path d="M1.5 12 H4.5 M1.5 15 H4.5" stroke="${SAFE}" stroke-width="1.2"/>
${smallCross}`;
const medicalBag = `${frame('M3 10 H19 L21 21 H2 Z M7 10 V6 Q7 4 10 4 Q13 4 13 6 V10')}
${smallCross}`;
const escapeBreathing = `<path d="M9.5 3 Q3 3 3 10 V15 Q3 21 9.5 22 Q16 21 16 15 V10 Q16 3 9.5 3 Z" fill="none" stroke="${W}" stroke-width="1.7"/>
<path d="M5.2 8 H13.8 V12 H5.2 Z" fill="${W}"/>
<circle cx="9.5" cy="17.2" r="2.8" fill="${W}"/>
<path d="M7.8 17.2 H11.2" stroke="${SAFE}" stroke-width="1.4"/>
${smallCross}`;
const oxygenResuscitator = `<rect x="3" y="8" width="6" height="13" rx="2.1" fill="${W}"/>
${frame('M6 8 V4 M3.7 4 H8.3')}
<path d="M8 6 Q13 6 13 11 V18 Q13 21 16 21 Q19 21 19 18" fill="none" stroke="${W}" stroke-width="1.4" stroke-linecap="round"/>
<path d="M18 10 Q19 8 20 10 L22 15 Q22 17 19 17 Q16 17 16 15 Z" fill="${W}"/>
${smallCross}`;
const emergencyHammer = `<g transform="translate(1 0) scale(.93)">${breakGlass.slice(0, breakGlass.indexOf('<path d="M3 19'))}</g>
<path d="M6 21 L13 10" stroke="${SAFE}" stroke-width="5"/>
${limbs('M6 21 L13 10')}
<path d="M9 8 L11 5 L18 9 L18 12 Z" fill="${W}" stroke="${SAFE}" stroke-width="1" stroke-linejoin="round"/>`;
const doorPull = `${frame('M4 21 V3 H20 V21')}
<path d="M18.2 4.5 L11 7 V19 L18.2 21 Z" fill="${W}"/>
<path d="M3 12 C1 18 10 21 17 15" fill="none" stroke="${SAFE}" stroke-width="3.8" stroke-linecap="round"/>
<path d="M20 13 L18.8 19 L17.1 16.8 L14.5 16.5 Z" fill="${W}" stroke="${SAFE}" stroke-width="1.5" stroke-linejoin="round"/>
${frame('M3 12 C1 18 10 21 17 15')}
<path d="M20 13 L18.8 19 L17.1 16.8 L14.5 16.5 Z" fill="${W}"/>`;
const turnAnticlockwise = `<path d="M9 8 L18 5 V21 H9 Z" fill="${W}"/>
<ellipse cx="11.8" cy="14" rx="2.1" ry="2.8" fill="${SAFE}"/>
<path d="M20 10 A8 8 0 0 0 4 10" fill="none" stroke="${W}" stroke-width="2.05" stroke-linecap="round"/>
<path d="M4 14 L.9 9.5 H3 V7 H5 V9.5 H7.1 Z" fill="${W}"/>`;
const emergencyStop = `<path d="M2 3 H6.5 L10 6 H17 Q19 6 19 8 Q19 9.5 17 9.5 H10 L7 8 H2 Z" fill="${W}"/>
<path d="M2 5.5 H6.2 M11 7.6 H16.7" stroke="${SAFE}" stroke-width="1.1" stroke-linecap="round"/>
<rect x="9" y="13" width="11" height="3.5" rx="1.4" fill="${W}"/>
<rect x="12" y="16" width="5" height="5" fill="${W}"/>
${frame('M4 11 V16 M22 11 V16 M7 22 H22')}`;
const outdoorRefuge = `<ellipse cx="14" cy="19.5" rx="8.2" ry="3" fill="${W}"/>
<g transform="translate(2 -1)">${runnerRight}</g>`;
const tsunamiArea = `<path d="M1.8 4 Q8 -1 11.5 6 Q7 3 6.5 7 Q6 11 10.2 15 L7.4 18 Q2 13 1.8 4 Z" fill="${W}"/>
<path d="M6 22 L22 14 V22 Z" fill="${W}"/>
<g transform="translate(11.1 .5) scale(.66)">${runnerRight}</g>`;

// Final Tier 3 rows: reuse the accepted cylinder body and hose-reel nozzle.
const cylinderBody = extinguisher.slice(extinguisher.indexOf('<rect x="5.6"'), extinguisher.indexOf('<rect x="7.2"'));
const hoseNozzle = hoseReel.slice(hoseReel.indexOf('<path d="M9.8 16.4'), hoseReel.indexOf(flame(.2, 1.4)));
const fixedInstallation = `<g transform="translate(14.8 8) rotate(90) scale(1.1 1) translate(-5.6 -7.4)">${cylinderBody}</g>
${frame('M4.5 15 V20 M12.5 15 V20 M2.5 20 H14.5')}${flame(.3, 0)}`;
const remoteRelease = `<g transform="translate(4.4 9) scale(1.2 .95) translate(-5.6 -7.4)">${cylinderBody}</g>
${frame('M8.4 6 V9')}
<circle cx="8.4" cy="4.4" r="2.2" fill="${W}"/>${flame(.3, 0)}`;
const fixedBattery = `${frame('M3.3 4 H14')}
${[2.2, 5.4, 8.6, 11.8].map(x => `<g transform="translate(${x} 8) scale(.32 1) translate(-5.6 -7.4)">${cylinderBody}</g>
<path d="M${x + 1.056} 4 V8" stroke="${W}" stroke-width="1.4"/>`).join('\n')}
${flame(.3, 0)}`;
const foamApplicator = `<g transform="translate(3.4 9) translate(-5.6 -7.4)">${cylinderBody}</g>
<path d="M6.7 9 V6 Q6.7 2.5 10.1 2.5 Q13.5 2.5 13.5 6 V10.5" fill="none" stroke="${W}" stroke-width="1.4" stroke-linecap="round"/>
<g transform="translate(2.5 -6)">${hoseNozzle}</g>${flame(.3, 0)}`;
const unconnectedHose = `<path d="M8 9.2 H9 C10.5 9.2 10.5 6.3 8 6.3 C3.2 6.3 3.2 13.4 8 13.4 C15.7 13.4 15.7 2.8 8 2.8 C4 2.8 2 5.5 2 9.4 V17" fill="none" stroke="${W}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
<g transform="translate(-9 .3)">${hoseNozzle}</g>
<rect x="6.6" y="8.2" width="2.4" height="2" rx=".4" fill="${W}"/>
${flame(.3, 0)}`;

const OBP = "https://www.iso.org/obp/ui#iso:grs:7010:";
const iso = (code, colour) => `ISO 7010:2019 ${code}; ISO 3864-1 ${colour === SAFE ? "safe-condition green" : "fire-equipment red"} square`;

// Plan-importance order: where you are and how you get out, then fire equipment and alarm,
// then first aid and rescue equipment.
const symbols = [
  {
    id: "you-are-here",
    label: "You are here (ISO 23601 location marker)",
    svg: hereMarker,
    engine: "here",
    dsl: ['here in <room> at x,y "YOU ARE HERE"', "you-are-here", "location-marker"],
    standard: "ISO 23601 (the viewer's position is required on every posted plan; the standard registers no graphic for it)",
    sourceUrl: "https://www.iso.org/obp/ui/#iso:std:iso:23601:ed-1:en",
    inExemplar: true,
    notes:
      "Copied exactly from the exemplar: a blue bull's-eye, kept out of the green and red sign colours so the reader's own position can't be mistaken for a safety sign. The engine draws a green crosshair plate, which reads as one more safe-condition sign.",
  },
  {
    id: "emergency-exit",
    label: "Emergency exit, right hand (ISO 7010 E002)",
    svg: plateDoc("Emergency exit, right hand (ISO 7010 E002)", SAFE, exitRight),
    engine: "exit",
    dsl: ["exit <id> in <room> at x,y hand right", "exit-final <id> in <room> at x,y hand right", "emergency-exit", "fire-exit"],
    standard: "ISO 7010:2019 E002 (E001 is the mirror image for left hand); ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E002`,
    inExemplar: true,
    notes:
      "A figure running right through a doorway on the right, leaning into the run with a bent front knee and swinging arms; the doorway bracket and all stroke weights are the exemplar's. The exemplar's runner leans backwards and its standalone plates add a threshold bar that is not part of E002; the engine's runner is an upright stick figure that reads as walking. The separate exit-final target adds the engine's threshold qualifier for the plan.",
  },
  {
    id: "emergency-exit-left",
    label: "Emergency exit, left hand (ISO 7010 E001)",
    svg: plateDoc("Emergency exit, left hand (ISO 7010 E001)", SAFE, mirror(exitRight)),
    engine: "exit",
    dsl: ["exit <id> in <room> at x,y hand left", "exit-final <id> in <room> at x,y hand left", "emergency-exit", "fire-exit"],
    standard: iso("E001", SAFE),
    sourceUrl: `${OBP}E001`,
    inExemplar: true,
    notes:
      "Registered image content: human figure moving to the left through a doorway. Drawn as the exact mirror image of the accepted E002 sample. The exemplar's left-hand final exit carries the same backwards-leaning runner and a threshold bar that E001 does not have; the engine mirrors its upright walking figure.",
  },
  {
    id: "exit-final",
    label: "Final exit",
    svg: plateDoc("Final exit", SAFE, exitFinal),
    engine: "exit-final",
    tier: 1,
    dsl: ['evacuation "Final exit" unit m\ncompliance iso\nroom lobby "Lobby" at 0,0 size 8x6\nhere in lobby at 1,3\nexit-final final in lobby at 8,3 side east hand right\n'],
    standard: "ISO 23601 §6 / NFPA 170 Ch.11; ISO 7010 E002 base pictogram",
    sourceUrl: "https://www.iso.org/obp/ui/#iso:std:iso:23601:ed-1:en",
    inExemplar: false,
    notes: "Accepted 30 px green plate, white runner and 1.7-unit doorway frame, with the engine's threshold bar below the doorway to identify a final exit on the plan. The bar is a plan qualifier, not a separately registered ISO 7010 pictogram. Tier 1 because the evacuation validator uses final exits for exit coverage and route destinations.",
  },
  {
    id: "exit-direction-right",
    label: "Emergency exit with direction arrow, right (ISO 7010 E002 + ISO 3864-3 arrow)",
    svg: comboDoc("Emergency exit with direction arrow, right (ISO 7010 E002 + ISO 3864-3 arrow)", SAFE, exitRight + "\n" + shift(arrowRight, 24)),
    engine: "exit-direction",
    dsl: ["exit-direction <id> in <room> at x,y hand right", "exit-arrow", "direction-arrow", "escape-direction"],
    standard: "ISO 7010:2019 E002 combined with the ISO 3864-3 directional arrow as a supplementary sign on one carrier; ISO 7010 withdrew the stand-alone direction arrows E005 and E006, so an arrow is never shown on its own",
    sourceUrl: `${OBP}E002`,
    inExemplar: true,
    notes:
      "The E002 sign with the arrow on the side the runner is heading, as the combination rule requires. Two full 30 px squares on one 60 x 30 px green carrier so the runner is the same size as on the stand-alone sign. The exemplar shrinks both halves to fit a 52 px carrier, splits them with a faint line that sits against the doorway and reads as a second door frame, uses the backwards-leaning runner and draws a plain triangle instead of an ISO 3864-3 shafted arrow. The engine squeezes a thin arrow into the top edge of an ordinary exit plate, above the runner's head.",
  },
  {
    id: "exit-direction-left",
    label: "Emergency exit with direction arrow, left (ISO 7010 E001 + ISO 3864-3 arrow)",
    svg: comboDoc("Emergency exit with direction arrow, left (ISO 7010 E001 + ISO 3864-3 arrow)", SAFE, mirror(exitRight + "\n" + shift(arrowRight, 24), 48)),
    engine: "exit-direction",
    dsl: ["exit-direction <id> in <room> at x,y hand left", "exit-arrow", "direction-arrow", "escape-direction"],
    standard: "ISO 7010:2019 E001 combined with the ISO 3864-3 directional arrow as a supplementary sign on one carrier (arrow first, on the side of travel)",
    sourceUrl: `${OBP}E001`,
    inExemplar: true,
    notes:
      "Mirror image of the right-hand combination: arrow pointing left on the left square, E001 on the right square, so the arrow, runner and doorway all point the same way. Same departures from the exemplar and the engine as the right-hand version.",
  },
  {
    id: "assembly-point",
    label: "Evacuation assembly point (ISO 7010 E007)",
    svg: plateDoc("Evacuation assembly point (ISO 7010 E007)", SAFE, assembly),
    engine: "assembly",
    dsl: ['assembly <id> outside at x,y "ASSEMBLY POINT"', "assembly-point", "muster-point", "muster"],
    standard: iso("E007", SAFE),
    sourceUrl: `${OBP}E007`,
    inExemplar: true,
    notes:
      "Registered image content: two human figures and the head of a third in a group, with four arrows coming from the corners pointing at them. The exemplar has four arrows pointing at an empty square from the middle of each side, and no people; the engine has four dots with plain diagonal lines and no people or arrowheads. ISO 7010 notes this pictogram tested below the comprehension threshold and should carry a text label such as ASSEMBLY POINT on the plan.",
  },
  {
    id: "fire-extinguisher",
    label: "Fire extinguisher (ISO 7010 F001)",
    svg: plateDoc("Fire extinguisher (ISO 7010 F001)", FIRE, extinguisher),
    engine: "extinguisher",
    dsl: ['extinguisher <id> in <room> at x,y class "ABC"', "fire-extinguisher"],
    standard: "ISO 7010:2019 F001; ISO 3864-1 fire-equipment red square",
    sourceUrl: `${OBP}F001`,
    inExemplar: true,
    notes:
      "The registered pictogram is a cylinder extinguisher with a label and valve beside flames, so the exemplar's extinguisher is kept, moved left, given a red label cut-out, and a flame is added on its right. Neither the exemplar nor the engine has the flame, and the engine's outlined jug shape doesn't read as an extinguisher.",
  },
  {
    id: "fire-alarm-call-point",
    label: "Fire alarm call point (ISO 7010 F005)",
    svg: plateDoc("Fire alarm call point (ISO 7010 F005)", FIRE, callPoint),
    engine: "call-point",
    dsl: ["call-point <id> in <room> at x,y", "fire-alarm", "fire-alarm-call-point", "alarm-call-point"],
    standard: "ISO 7010:2019 F005; ISO 3864-1 fire-equipment red square",
    sourceUrl: `${OBP}F005`,
    inExemplar: true,
    notes:
      "Drawn to the registered composition: a hand seen from above with the index finger pressing the dot in a square that is open at the bottom, and a flame on the right. The exemplar's square and three bars don't read as a hand and it has no flame; the engine draws a framed circle that reads as a generic device.",
  },
  {
    id: "first-aid",
    label: "First aid (ISO 7010 E003)",
    svg: plateDoc("First aid (ISO 7010 E003)", SAFE, cross),
    engine: "first-aid",
    dsl: ["first-aid <id> in <room> at x,y", "firstaid", "first-aid-kit"],
    standard: "ISO 7010:2019 E003; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E003`,
    inExemplar: true,
    notes:
      "Copied exactly from the exemplar: a white equal-armed cross centred on the green plate, arms 5.2 units wide with slightly rounded ends. The engine's cross is nearly the same; the visible difference is its heavier, square-ended arms.",
  },
  {
    id: "aed",
    label: "Automated external defibrillator (ISO 7010 E010)",
    svg: plateDoc("Automated external defibrillator (ISO 7010 E010)", SAFE, aed),
    engine: "aed",
    dsl: ["aed <id> in <room> at x,y", "defibrillator", "automated-external-defibrillator"],
    standard: iso("E010", SAFE),
    sourceUrl: `${OBP}E010`,
    inExemplar: false,
    notes:
      "Registered image content: a heart with a lightning bolt in the middle, and a first-aid cross. The bolt is cut out of the heart in plate green and the cross sits in the top-right corner, the same small cross used on every E-series sign that needs one. The engine has no cross and fills the bolt in near-black, a colour ISO 3864-1 does not allow on a safe-condition sign.",
  },
  {
    id: "fire-hose-reel",
    label: "Fire hose reel (ISO 7010 F002)",
    svg: plateDoc("Fire hose reel (ISO 7010 F002)", FIRE, hoseReel),
    engine: "hose-reel",
    dsl: ["hose-reel <id> in <room> at x,y", "fire-hose-reel"],
    standard: iso("F002", FIRE),
    sourceUrl: `${OBP}F002`,
    inExemplar: false,
    notes:
      `Registered image content: seven vertical lines (the hose wound on the reel, seen side-on), one of them continuing down to a trapezoid nozzle, a circle with a cross (the handwheel) on a line from a vertical wall bar, and a flame. Drawn with five hose turns instead of seven so the gaps between them survive at 30 px. The engine draws the reel face-on as two circles with a trailing hose and has no flame.`,
  },
  {
    id: "emergency-telephone",
    label: "Emergency telephone (ISO 7010 E004)",
    svg: plateDoc("Emergency telephone (ISO 7010 E004)", SAFE, emergencyPhone),
    engine: "emergency-phone",
    dsl: ["emergency-phone <id> in <room> at x,y"],
    standard: iso("E004", SAFE),
    sourceUrl: `${OBP}E004`,
    inExemplar: false,
    notes:
      "Registered image content: a telephone receiver in profile, and a first-aid cross. A filled handset tilted with its cups facing up-right, and the shared small cross top right; the fire emergency telephone F006 is the same handset with a flame on a red plate. The engine draws an outlined handset with no cross, which is identical to its fire-phone apart from the plate colour.",
  },
  {
    id: "fire-equipment",
    label: "Collection of firefighting equipment (ISO 7010 F004)",
    svg: plateDoc("Collection of firefighting equipment (ISO 7010 F004)", FIRE, fireEquipment),
    engine: "fire-equipment",
    dsl: ["fire-equipment <id> in <room> at x,y"],
    standard: iso("F004", FIRE),
    sourceUrl: `${OBP}F004`,
    inExemplar: false,
    notes:
      "Registered image content: a fire helmet in profile, and a flame. A firefighter's helmet facing right, with a comb on top, a badge at the front and a long back brim, on the left; the shared flame on the right, as F001 places its extinguisher. The engine draws a large flame with a dark circled plus, which is not the registered helmet and uses a colour ISO 3864-1 does not allow on a fire-equipment sign.",
  },
  {
    id: "eyewash-station",
    label: "Eyewash station (ISO 7010 E011)",
    svg: plateDoc("Eyewash station (ISO 7010 E011)", SAFE, eyewash),
    engine: "eyewash",
    dsl: ["eyewash <id> in <room> at x,y"],
    standard: iso("E011", SAFE),
    sourceUrl: `${OBP}E011`,
    inExemplar: false,
    notes:
      "Registered image content: an eye above running water coming out of a shower head, and a first-aid cross. An outlined eye with a solid iris, three jets rising from an upturned nozzle on a short stem, and the shared small cross top right. The engine has the eye and a single water drop but no nozzle and no cross.",
  },
  {
    id: "safety-shower",
    label: "Safety shower (ISO 7010 E012)",
    svg: plateDoc("Safety shower (ISO 7010 E012)", SAFE, safetyShower),
    engine: "safety-shower",
    dsl: ["safety-shower <id> in <room> at x,y"],
    standard: iso("E012", SAFE),
    sourceUrl: `${OBP}E012`,
    inExemplar: false,
    notes:
      "Registered image content: a human figure under running water coming out of a shower head, and a first-aid cross. A standing figure under a shower head fed by a pipe from the left, three falling jets, and the shared small cross top right. The engine draws the pipe, head and water but no person and no cross.",
  },
  {
    id: "evacuation-temporary-refuge",
    label: "Evacuation temporary refuge (ISO 7010 E024)",
    svg: plateDoc("Evacuation temporary refuge (ISO 7010 E024)", SAFE, refuge),
    engine: "refuge",
    dsl: ["refuge sample in room1 at 2,2"],
    standard: iso("E024", SAFE),
    sourceUrl: `${OBP}E024`,
    inExemplar: false,
    notes: "Wheelchair user with the accepted four inward corner arrows; reduced central figure to keep the arrows separate.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "protection-shelter",
    label: "Protection shelter (ISO 7010 E021)",
    svg: plateDoc("Protection shelter (ISO 7010 E021)", SAFE, shelter),
    engine: "shelter",
    dsl: ["shelter sample in room1 at 2,2"],
    standard: iso("E021", SAFE),
    sourceUrl: `${OBP}E021`,
    inExemplar: false,
    notes: "Four copies of the accepted standing figure inside an irregular hexagon, with a line and shield below.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "stretcher",
    label: "Stretcher (ISO 7010 E013)",
    svg: plateDoc("Stretcher (ISO 7010 E013)", SAFE, stretcher),
    engine: "stretcher",
    dsl: ["stretcher sample in room1 at 2,2"],
    standard: iso("E013", SAFE),
    sourceUrl: `${OBP}E013`,
    inExemplar: false,
    notes: "Reclining person on a stretcher, with the shared top-right first-aid cross. Simplified at 30 px.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "doctor",
    label: "Doctor (ISO 7010 E009)",
    svg: plateDoc("Doctor (ISO 7010 E009)", SAFE, doctor),
    engine: "doctor",
    dsl: ["doctor sample in room1 at 2,2"],
    standard: iso("E009", SAFE),
    sourceUrl: `${OBP}E009`,
    inExemplar: false,
    notes: "Head and shoulders with stethoscope cut out in green, plus the shared first-aid cross.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "break-to-obtain-access",
    label: "Break to obtain access (ISO 7010 E008)",
    svg: plateDoc("Break to obtain access (ISO 7010 E008)", SAFE, breakGlass),
    engine: "break-glass",
    dsl: ["break-glass sample in room1 at 2,2"],
    standard: iso("E008", SAFE),
    sourceUrl: `${OBP}E008`,
    inExemplar: false,
    notes: "Fist gripping a diagonal bar against a star-shaped break; original outline, simplified fingers.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "emergency-window-escape-ladder",
    label: "Emergency window with escape ladder (ISO 7010 E016)",
    svg: plateDoc("Emergency window with escape ladder (ISO 7010 E016)", SAFE, windowLadder),
    engine: "escape-ladder",
    dsl: ["escape-ladder sample in room1 at 2,2"],
    standard: iso("E016", SAFE),
    sourceUrl: `${OBP}E016`,
    inExemplar: false,
    notes: "Accepted runner adapted to a window above a ladder. This engine id denotes E016, not the permanently fixed E059 ladder.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "rescue-window",
    label: "Rescue window (ISO 7010 E017)",
    svg: plateDoc("Rescue window (ISO 7010 E017)", SAFE, rescueWindow),
    engine: "rescue-window",
    dsl: ["rescue-window sample in room1 at 2,2"],
    standard: iso("E017", SAFE),
    sourceUrl: `${OBP}E017`,
    inExemplar: false,
    notes: "Window with the accepted runner and a fire-service vehicle carrying a rescue ladder below; vehicle details reduced for true size.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "door-opens-pushing-left",
    label: "Door opens by pushing on the left-hand side (ISO 7010 E022)",
    svg: plateDoc("Door opens by pushing on the left-hand side (ISO 7010 E022)", SAFE, doorPush),
    engine: "emergency-door-push",
    dsl: ["emergency-door-push sample in room1 at 2,2 hand left"],
    standard: iso("E022", SAFE),
    sourceUrl: `${OBP}E022`,
    inExemplar: false,
    notes: "Doorway with an outward-swinging door and curved arrow pointing left. This row selects E022; E023 is the opposite-hand variant.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "door-slides-right",
    label: "Door slides right to open (ISO 7010 E033)",
    svg: plateDoc("Door slides right to open (ISO 7010 E033)", SAFE, doorSlide),
    engine: "emergency-door-slide",
    dsl: ["emergency-door-slide sample in room1 at 2,2 hand right"],
    standard: iso("E033", SAFE),
    sourceUrl: `${OBP}E033`,
    inExemplar: false,
    notes: "Sliding rectangle between top and bottom tracks, with the accepted shafted arrow pointing right. E034 left-hand variant is not drawn in this row.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "fire-ladder",
    label: "Fire ladder (ISO 7010 F003)",
    svg: plateDoc("Fire ladder (ISO 7010 F003)", FIRE, fireLadder),
    engine: "fire-ladder",
    dsl: ["fire-ladder sample in room1 at 2,2"],
    standard: iso("F003", FIRE),
    sourceUrl: `${OBP}F003`,
    inExemplar: false,
    notes: "Converging rails with six rungs and the accepted shared flame on the right.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "fire-emergency-telephone",
    label: "Fire emergency telephone (ISO 7010 F006)",
    svg: plateDoc("Fire emergency telephone (ISO 7010 F006)", FIRE, firePhone),
    engine: "fire-phone",
    dsl: ["fire-phone sample in room1 at 2,2"],
    standard: iso("F006", FIRE),
    sourceUrl: `${OBP}F006`,
    inExemplar: false,
    notes: "Accepted E004 handset with the shared fire flame on a red plate; no first-aid cross.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "fire-service-riser",
    label: "Fire-service riser (unregistered text label)",
    svg: textLabel("Fire-service riser (unregistered text label)", ["FIRE SERVICE", "RISER"]),
    engine: "riser",
    dsl: ["riser sample in room1 at 2,2"],
    standard: "No ISO 7010 code; no ISO 3864-1 category: neutral text label, not a registered safety sign",
    sourceUrl: null,
    inExemplar: false,
    notes: "No ISO 7010 sign or ISO 3864 safety category is registered. Neutral text label as the inventory allows; no national pictogram is asserted. Wider carrier preserves readable text.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "not-an-exit",
    label: "Not an exit (unregistered text label)",
    svg: textLabel("Not an exit (unregistered text label)", ["NOT AN", "EXIT"]),
    engine: "not-an-exit",
    dsl: ["not-an-exit sample in room1 at 2,2"],
    standard: "No ISO 7010 code; no ISO 3864-1 category: neutral text label, not a registered safety sign",
    sourceUrl: null,
    inExemplar: false,
    notes: "No ISO 7010 sign or ISO 3864 safety category is registered. Neutral text label, not the engine red fire-equipment square or a claimed ISO prohibition. Wider carrier preserves readable text.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "no-elevator",
    label: "Do not use lift in the event of fire (ISO 7010 P020)",
    svg: noLift,
    engine: "no-elevator",
    dsl: ["no-elevator sample in room1 at 2,2"],
    standard: "ISO 7010:2019 P020; ISO 3864-1 prohibition red ring and diagonal slash on white, black pictogram",
    sourceUrl: `${OBP}P020`,
    inExemplar: false,
    notes: "ISO 3864-1 prohibition: red ring and slash on white, black lift, people and fire. Reuses the accepted figure and flame in black; category convention overrides the square-plate style.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "fire-alarm-flashing-light",
    label: "Fire alarm flashing light (ISO 7010 F018)",
    svg: plateDoc("Fire alarm flashing light (ISO 7010 F018)", FIRE, flashingAlarm),
    engine: "alarm-sounder",
    dsl: ["alarm-sounder sample in room1 at 2,2"],
    standard: "ISO 7010:2019/Amd 4:2021 F018; ISO 3864-1 fire-equipment red square",
    sourceUrl: `${OBP}F018`,
    inExemplar: false,
    notes: "F018 identifies a visual flashing alarm, not an audible sounder. Mapped to the combined engine sounder/strobe entry only for its visual-alarm meaning; domed beacon and rays plus the shared flame. Three rays replace the registered nine to retain open gaps at 30 px.",
    tier: 2,
    usageUsers: null,
  },
  {
    id: "accessible-emergency-exit-left",
    label: "Emergency exit for people unable to walk, left (ISO 7010 E026)",
    svg: plateDoc("Emergency exit for people unable to walk, left (ISO 7010 E026)", SAFE, accessibleExit),
    engine: null,
    dsl: [],
    standard: iso("E026", SAFE),
    sourceUrl: `${OBP}E026`,
    inExemplar: false,
    notes: "Wheelchair user moving left through a left-hand doorway. This row selects E026; E030 is the right-hand variant. Accompany this sign on the plan with E001 or E002. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "evacuation-chair",
    label: "Evacuation chair (ISO 7010 E060)",
    svg: plateDoc("Evacuation chair (ISO 7010 E060)", SAFE, evacuationChair),
    engine: null,
    dsl: [],
    standard: iso("E060", SAFE),
    sourceUrl: `${OBP}E060`,
    inExemplar: false,
    notes: "Seated person, an attendant handling the chair and descending stairs, all facing right. Accepted runner adapted for the attendant; wheels and chair detail simplified at 30 px. Engine unsupported; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "fixed-escape-ladder",
    label: "Escape ladder, permanently fixed (ISO 7010 E059)",
    svg: plateDoc("Escape ladder, permanently fixed (ISO 7010 E059)", SAFE, fixedLadder),
    engine: null,
    dsl: [],
    standard: iso("E059", SAFE),
    sourceUrl: `${OBP}E059`,
    inExemplar: false,
    notes: "Six horizontal rungs between parallel vertical rails on green. Separate from E016 window-with-ladder. Engine unsupported; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "evacuation-lift",
    label: "Evacuation lift for people unable to use stairs (ISO 7010 E070)",
    svg: plateDoc("Evacuation lift for people unable to use stairs (ISO 7010 E070)", SAFE, evacuationLift),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E070; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E070`,
    inExemplar: false,
    notes: "Accepted wheelchair inside a lift outline, with supplementary up and down arrows above and below; arrow and wheelchair geometry reused at reduced scale. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "fire-blanket",
    label: "Fire blanket (ISO 7010 F016)",
    svg: plateDoc("Fire blanket (ISO 7010 F016)", FIRE, fireBlanket),
    engine: null,
    dsl: [],
    standard: "ISO 7010 F016; ISO 3864-1 fire-equipment red square",
    sourceUrl: `${OBP}F016`,
    inExemplar: false,
    notes: "Person holding a blanket in front of the body, feet visible below, with the shared flame at right. Simplified blanket edge and accepted figure stroke weights. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "fire-protection-door",
    label: "Fire protection door (ISO 7010 F007)",
    svg: plateDoc("Fire protection door (ISO 7010 F007)", FIRE, fireDoor),
    engine: null,
    dsl: [],
    standard: "ISO 7010 F007; ISO 3864-1 fire-equipment red square",
    sourceUrl: `${OBP}F007`,
    inExemplar: false,
    notes: "Accepted angled door and curved closing arrow adapted to the left of the shared flame. This is the registered sign, separate from the engine structural fire-door mark. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "firefighters-lift",
    label: "Firefighters’ lift (ISO 7010 F017)",
    svg: plateDoc("Firefighters’ lift (ISO 7010 F017)", FIRE, firefightersLift),
    engine: null,
    dsl: [],
    standard: "ISO 7010 F017; ISO 3864-1 fire-equipment red square",
    sourceUrl: `${OBP}F017`,
    inExemplar: false,
    notes: "Lift outline enclosing an outlined left-facing head wearing the accepted fire helmet, mirrored and reduced; shared flame on the right. Helmet badge simplified at true size. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "wheeled-fire-extinguisher",
    label: "Wheeled fire extinguisher (ISO 7010 F009)",
    svg: plateDoc("Wheeled fire extinguisher (ISO 7010 F009)", FIRE, wheeledExtinguisher),
    engine: null,
    dsl: [],
    standard: "ISO 7010 F009; ISO 3864-1 fire-equipment red square",
    sourceUrl: `${OBP}F009`,
    inExemplar: false,
    notes: "Accepted extinguisher cylinder, valve, label and hose mounted on a cart with a large visible wheel; shared flame at right. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "emergency-descent-device",
    label: "Emergency descent device (ISO 7010 E073)",
    svg: plateDoc("Emergency descent device (ISO 7010 E073)", SAFE, descentDevice),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E073; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E073`,
    inExemplar: false,
    notes: "Person leaning right in a body harness, holding a line from above, with the accepted arrow pointing down. Harness and hands simplified while preserving the rope and downward movement. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "evacuation-mattress",
    label: "Evacuation mattress (ISO 7010 E067)",
    svg: plateDoc("Evacuation mattress (ISO 7010 E067)", SAFE, evacuationMattress),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E067; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E067`,
    inExemplar: false,
    notes: "Accepted reclining stretcher figure adapted to a sloping mattress, pulled by the accepted runner from stairs onto a floor; shared first-aid cross. Reduced details keep the mattress separate from the steps. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "evacuation-equipment",
    label: "Evacuation equipment (ISO 7010 E076)",
    svg: plateDoc("Evacuation equipment (ISO 7010 E076)", SAFE, evacuationEquipment),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E076; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E076`,
    inExemplar: false,
    notes: "Megaphone beside a high-visibility waistcoat with two vertical and two horizontal bands cut out in green; no medical cross because the registered sign has none. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "first-aid-responder",
    label: "First aid responder (ISO 7010 E064)",
    svg: plateDoc("First aid responder (ISO 7010 E064)", SAFE, firstAidResponder),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E064; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E064`,
    inExemplar: false,
    notes: "Upper body with an armband on the person’s right arm (viewer’s left), plus the shared top-right first-aid cross. Distinct from the accepted doctor’s stethoscope. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "medical-grab-bag",
    label: "Medical grab bag (ISO 7010 E027)",
    svg: plateDoc("Medical grab bag (ISO 7010 E027)", SAFE, medicalBag),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E027; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E027`,
    inExemplar: false,
    notes: "Outlined bag and loop handles, with the shared first-aid cross in the top-right corner. Zippers and seams omitted to preserve open gaps at 30 px. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "emergency-escape-breathing-device",
    label: "Emergency escape breathing device (ISO 7010 E029)",
    svg: plateDoc("Emergency escape breathing device (ISO 7010 E029)", SAFE, escapeBreathing),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E029; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E029`,
    inExemplar: false,
    notes: "Front-facing full-face mask with visor and circular regulator, plus the shared first-aid cross. Regulator grille reduced to one green slot. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "oxygen-resuscitator",
    label: "Oxygen resuscitator (ISO 7010 E028)",
    svg: plateDoc("Oxygen resuscitator (ISO 7010 E028)", SAFE, oxygenResuscitator),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E028; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E028`,
    inExemplar: false,
    notes: "Oxygen cylinder with manual valve, hose and mask, plus the shared first-aid cross. Uses the accepted hose stroke and filled cylinder vocabulary. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "emergency-hammer",
    label: "Emergency hammer (ISO 7010 E025)",
    svg: plateDoc("Emergency hammer (ISO 7010 E025)", SAFE, emergencyHammer),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E025; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E025`,
    inExemplar: false,
    notes: "Emergency hammer striking a star-shaped crack adapted from the accepted break-to-obtain-access sign. Hammer head and handle replace the fist and bar; green clearance isolates the tool from the break. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "door-opens-pulling-left",
    label: "Door opens by pulling on the left-hand side (ISO 7010 E057)",
    svg: plateDoc("Door opens by pulling on the left-hand side (ISO 7010 E057)", SAFE, doorPull),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E057; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E057`,
    inExemplar: false,
    notes: "Inward-opening door with a curved arrow pointing right, using the accepted door frame and stroke weights. Selects E057; opposite-hand E058 is not drawn for this paired inventory row. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "turn-anticlockwise-to-open",
    label: "Turn anticlockwise to open (ISO 7010 E018)",
    svg: plateDoc("Turn anticlockwise to open (ISO 7010 E018)", SAFE, turnAnticlockwise),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E018; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E018`,
    inExemplar: false,
    notes: "Doorknob on a door in perspective, with a semicircular anticlockwise arrow. Selects E018; clockwise E019 is not drawn for this paired row. Used on escape doors with a security opening mechanism. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "emergency-stop-button",
    label: "Emergency stop button (ISO 7010 E020)",
    svg: plateDoc("Emergency stop button (ISO 7010 E020)", SAFE, emergencyStop),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E020; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E020`,
    inExemplar: false,
    notes: "Hand above a mushroom button with two flanking lines. Green safe-condition sign identifying the control’s location; the physical button colour does not change the sign category. Fingers reduced to one separation. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "natural-disaster-outdoor-refuge",
    label: "Natural disaster outdoor refuge area (ISO 7010 E065)",
    svg: plateDoc("Natural disaster outdoor refuge area (ISO 7010 E065)", SAFE, outdoorRefuge),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E065; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E065`,
    inExemplar: false,
    notes: "Accepted moving figure stepping onto a filled oval area. No shelter roof, assembly arrows or medical cross: these would change the registered content. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "tsunami-evacuation-area",
    label: "Tsunami evacuation area (ISO 7010 E062)",
    svg: plateDoc("Tsunami evacuation area (ISO 7010 E062)", SAFE, tsunamiArea),
    engine: null,
    dsl: [],
    standard: "ISO 7010 E062; ISO 3864-1 safe-condition green square",
    sourceUrl: `${OBP}E062`,
    inExemplar: false,
    notes: "Accepted right-moving runner between a curling tsunami wave and rising land. Selects E062 area; E063 building is not drawn for this paired row. Supplementary text or training is needed for comprehension. Engine has no corresponding sign; DSL examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "fixed-fire-extinguishing-installation",
    label: "Fixed fire extinguishing installation (ISO 7010 F012)",
    svg: plateDoc("Fixed fire extinguishing installation (ISO 7010 F012)", FIRE, fixedInstallation),
    engine: null,
    dsl: [],
    standard: iso("F012", FIRE),
    sourceUrl: `${OBP}F012`,
    inExemplar: false,
    notes: "Registered F012: horizontal tank on two supports and a frame, with the shared flame. Accepted cylinder body rotated into profile; frame uses the accepted stroke. Original geometry, simplified at 30 px. Engine has no corresponding sign and the DSL cannot express it; examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "remote-release-station",
    label: "Remote release station (ISO 7010 F014)",
    svg: plateDoc("Remote release station (ISO 7010 F014)", FIRE, remoteRelease),
    engine: null,
    dsl: [],
    standard: iso("F014", FIRE),
    sourceUrl: `${OBP}F014`,
    inExemplar: false,
    notes: "Registered F014: bottle topped by a knob handle, with the shared flame. Reuses the accepted cylinder body; the round release knob distinguishes it from F001 and its lever, label and hose. Original geometry. Engine has no corresponding sign and the DSL cannot express it; examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "fixed-fire-extinguishing-battery",
    label: "Fixed fire extinguishing battery (ISO 7010 F008)",
    svg: plateDoc("Fixed fire extinguishing battery (ISO 7010 F008)", FIRE, fixedBattery),
    engine: null,
    dsl: [],
    standard: iso("F008", FIRE),
    sourceUrl: `${OBP}F008`,
    inExemplar: false,
    notes: "Registered F008: four bottles connected to one manifold, with the shared flame. Four reduced copies of the accepted cylinder body retain open gaps at 30 px. Selects F008 for the grouped battery / bottle inventory row; F013 is also registered, for a single bottle viewed end-on on two supports, and is not drawn here. Engine has no corresponding sign and the DSL cannot express it; examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "portable-foam-applicator",
    label: "Portable foam applicator unit (ISO 7010 F010)",
    svg: plateDoc("Portable foam applicator unit (ISO 7010 F010)", FIRE, foamApplicator),
    engine: null,
    dsl: [],
    standard: iso("F010", FIRE),
    sourceUrl: `${OBP}F010`,
    inExemplar: false,
    notes: "Registered F010: foam can with a gooseneck hose ending in a venturi nozzle, with the shared flame. Reuses the accepted cylinder body, hose stroke and tapered hose-reel nozzle; fine fittings omitted at 30 px. Selects F010 for the grouped applicator / monitor row; F011 water fog applicator and F015 fire monitor are also registered distinct signs, not interchangeable meanings or drawn variants here. Engine has no corresponding sign and the DSL cannot express it; examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
  {
    id: "unconnected-fire-hose",
    label: "Unconnected fire hose (ISO 7010 F019)",
    svg: plateDoc("Unconnected fire hose (ISO 7010 F019)", FIRE, unconnectedHose),
    engine: null,
    dsl: [],
    standard: "ISO 7010:2019/Amd 3:2021 F019; ISO 3864-1 fire-equipment red square",
    sourceUrl: `${OBP}F019`,
    inExemplar: false,
    notes: "Registered F019: spirally coiled hose, nozzle and free end coupling, with the shared flame. Original open spiral using the accepted hose stroke and hose-reel nozzle; winding reduced for 30 px readability. Free coupling distinguishes this from the wall-mounted F002 reel. Engine has no corresponding sign and the DSL cannot express it; examples intentionally empty.",
    tier: 3,
    usageUsers: null,
  },
];

const manifest = {
  type: "evacuation",
  variant: "iso",
  exemplar: "evacuation/iso",
  style:
    "Every sign is a 30 px square plate (a 24-unit grid drawn at 1.25x, as on the exemplar plan) with 2.5 px corner radius, filled safe-condition green #00843D or fire-equipment red #C8102E, with no outline, border or text. " +
    "Artwork is white #fff knockout: filled shapes plus round-capped strokes of 2.56 px for figures and fingers and 2.1 px for frames (1.75 px for hoses, water and outlines), with plate-colour cut-outs for inner detail; the flame is one shared shape on every fire sign, and E-series signs that carry a first-aid cross share one small cross in the top-right corner. " +
    "An exit sign with a direction arrow is two such squares on one 60 x 30 px carrier with no divider, the arrow on the side of travel. " +
    "The \"You are here\" marker is deliberately not a sign: a 33.9 px blue #005387 disc with a 2.2 px white ring and white centre dot; every file has 8 px padding.",
  symbols: symbols.map(({ svg, ...s }) => ({ ...s, file: `${s.id}.svg`, tier: s.tier ?? 1, usageUsers: null })),
};
// Keep the manifest's field order readable: id, label, file first.
manifest.symbols = manifest.symbols.map(({ id, label, file, ...rest }) => ({ id, label, file, ...rest }));

await mkdir(OUT, { recursive: true });
for (const s of symbols) await writeFile(new URL(`${s.id}.svg`, OUT), s.svg);
await writeFile(new URL("manifest.json", OUT), JSON.stringify(manifest, null, 2) + "\n");
console.log("wrote", symbols.map((s) => s.id).join(", "));
