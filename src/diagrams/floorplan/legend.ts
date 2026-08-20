import type {
  FloorplanAst,
  FloorplanLayoutResult,
  SafetyColour,
  SafetyKind,
} from "./types";
import type {
  LegendItem,
  LegendSection,
  LegendSpec,
} from "../../core/types";

const SECTIONS: LegendSection[] = [
  { id: "routes", title: "Escape routes" },
  { id: "exits", title: "Exits" },
  { id: "fire", title: "Fire equipment" },
  { id: "firstaid", title: "First aid" },
  { id: "structural", title: "Structural" },
];

const LABELS: Readonly<Record<SafetyKind, string>> = {
  here: "You are here",
  exit: "Emergency exit",
  "exit-direction": "Exit direction",
  "exit-final": "Final exit",
  assembly: "Assembly point",
  refuge: "Area of refuge",
  shelter: "Emergency shelter",
  "first-aid": "First aid",
  aed: "Automated external defibrillator",
  stretcher: "Stretcher",
  doctor: "Doctor",
  eyewash: "Emergency eyewash",
  "safety-shower": "Emergency shower",
  "emergency-phone": "Emergency telephone",
  "break-glass": "Break glass for access",
  "escape-ladder": "Escape ladder",
  "rescue-window": "Rescue window",
  "emergency-door-push": "Push to open emergency door",
  "emergency-door-slide": "Slide to open emergency door",
  extinguisher: "Fire extinguisher",
  "hose-reel": "Fire hose reel",
  "fire-ladder": "Fire ladder",
  "fire-equipment": "Firefighting equipment",
  "call-point": "Fire alarm call point",
  "fire-phone": "Fire service telephone",
  riser: "Fire riser / standpipe",
  "not-an-exit": "Not an exit",
  "no-elevator": "Do not use elevator",
  "alarm-sounder": "Alarm sounder",
};

function sectionFor(kind: SafetyKind): string {
  if (
    kind === "exit" ||
    kind === "exit-direction" ||
    kind === "exit-final" ||
    kind === "assembly"
  ) {
    return "exits";
  }
  if (
    kind === "extinguisher" ||
    kind === "hose-reel" ||
    kind === "fire-ladder" ||
    kind === "fire-equipment" ||
    kind === "call-point" ||
    kind === "fire-phone" ||
    kind === "riser"
  ) {
    return "fire";
  }
  if (
    kind === "first-aid" ||
    kind === "aed" ||
    kind === "stretcher" ||
    kind === "doctor" ||
    kind === "eyewash" ||
    kind === "safety-shower" ||
    kind === "emergency-phone"
  ) {
    return "firstaid";
  }
  return "structural";
}

function colourValue(colour: SafetyColour): string {
  if (colour === "safe") return "#00843D";
  if (colour === "fire") return "#C8102E";
  if (colour === "mandatory") return "#005387";
  if (colour === "warning") return "#FFCC00";
  return "#334155";
}

/** Build the mandatory Tier-M legend from the encodings actually in the plan. */
export function buildEvacuationLegend(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult
): LegendSpec {
  const evacuation = lay.evacuation;
  const items: LegendItem[] = [];
  const seen = new Set<string>();

  for (const route of evacuation?.routes ?? []) {
    const key = `route.${route.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      key,
      label:
        route.kind === "primary"
          ? "Primary escape route"
          : route.kind === "secondary"
            ? "Alternative escape route"
            : route.kind === "accessible"
              ? "Accessible escape route"
              : "Rescue route",
      kind: "line",
      color: route.kind === "rescue" ? "#006EB6" : "#00A651",
      pattern: route.kind === "secondary" ? "dashed" : "solid",
      strokeWidth: 4,
      section: "routes",
    });
  }

  for (const symbol of evacuation?.symbols ?? []) {
    if (seen.has(symbol.kind)) continue;
    seen.add(symbol.kind);
    const suffix =
      ast.compliance === "nfpa" || !symbol.code ? "" : ` (${symbol.code})`;
    items.push({
      key: symbol.kind,
      label: `${LABELS[symbol.kind]}${suffix}`,
      kind: "shape",
      shape: symbol.kind === "here" ? "circle" : "square",
      fill: colourValue(symbol.colour),
      color: colourValue(symbol.colour),
      section: sectionFor(symbol.kind),
    });
  }

  for (const mark of evacuation?.fireDoors ?? []) {
    if (seen.has(mark.kind)) continue;
    seen.add(mark.kind);
    items.push({
      key: mark.kind,
      label: mark.kind === "fire-door" ? "Fire-rated door" : "Smoke-control door",
      kind: "fill-pattern",
      color: "#334155",
      pattern: mark.kind === "fire-door" ? "broken" : "wavy",
      section: "structural",
    });
  }

  return {
    mode: "on",
    title: "Legend",
    position: "bottom-inline",
    columns: 1,
    sections: SECTIONS,
    items,
  };
}
