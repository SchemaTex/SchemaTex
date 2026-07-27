import { applyLegendOverrides } from "../../core/legend";
import type {
  CompliancePolicy,
  EscapeRouteAst,
  EvacuationLayoutData,
  EvacuationScale,
  FloorplanAst,
  FloorplanLayoutResult,
  FireDoorGeom,
  RouteGeom,
  RoutePoint,
  SafetyKind,
  SafetySymbolGeom,
} from "./types";
import { buildEvacuationLegend } from "./legend";
import { resolveSafetySymbol, SAFETY_SYMBOLS } from "./safety-symbols";

const FT = 0.3048;
const SHEET_MARGIN_MM = 15;
const SCALE_STEPS = [50, 100, 200, 250, 350, 500, 750, 1000] as const;

/** Portrait dimensions; orientation is applied explicitly below. */
export const EVACUATION_SHEETS_MM = {
  a4: { w: 210, h: 297 },
  a3: { w: 297, h: 420 },
  a2: { w: 420, h: 594 },
  letter: { w: 215.9, h: 279.4 },
  tabloid: { w: 279.4, h: 431.8 },
} as const;

export interface ProfileRules {
  /** Coarsest permitted scale denominator; null when the profile has no floor. */
  maxScaleDenominator: number | null;
  minSymbolMm: number | null;
  requireBilingual: boolean;
  autoNoElevator: boolean;
  twoRoutesSeverity: "error" | "warning";
  exitGlyph: "iso" | "nfpa";
  hereGlyph: "iso" | "nfpa" | "uae";
}

export const EVACUATION_PROFILES: Readonly<
  Record<CompliancePolicy, ProfileRules>
> = {
  iso: {
    maxScaleDenominator: 250,
    minSymbolMm: 7,
    requireBilingual: false,
    autoNoElevator: false,
    twoRoutesSeverity: "warning",
    exitGlyph: "iso",
    hereGlyph: "iso",
  },
  nfpa: {
    maxScaleDenominator: null,
    minSymbolMm: null,
    requireBilingual: false,
    autoNoElevator: true,
    twoRoutesSeverity: "error",
    exitGlyph: "nfpa",
    hereGlyph: "nfpa",
  },
  uae: {
    maxScaleDenominator: 250,
    minSymbolMm: 7,
    requireBilingual: true,
    autoNoElevator: true,
    twoRoutesSeverity: "warning",
    exitGlyph: "iso",
    hereGlyph: "uae",
  },
};

const round = (value: number): number => Math.round(value * 1e6) / 1e6;
const key = (floor: number, id: string): string => `${floor}\0${id}`;

function plateExtent(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult,
  level: number
): { w: number; h: number } {
  const plate = lay.plates.find((candidate) => candidate.level === level);
  if (!plate) return { w: 1, h: 1 };
  let minX = plate.bounds.minX;
  let minY = plate.bounds.minY;
  let maxX = plate.bounds.maxX;
  let maxY = plate.bounds.maxY;
  const unit = ast.unit === "ft" ? FT : 1;
  for (const symbol of ast.safety) {
    if (symbol.floor !== level || !symbol.outside) continue;
    minX = Math.min(minX, symbol.x * unit);
    minY = Math.min(minY, symbol.y * unit);
    maxX = Math.max(maxX, symbol.x * unit);
    maxY = Math.max(maxY, symbol.y * unit);
  }
  return {
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

export function computeEvacuationScale(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult
): EvacuationScale {
  const rawSheet = EVACUATION_SHEETS_MM[ast.sheet.size];
  const sheet =
    ast.sheet.orientation === "landscape"
      ? { w: Math.max(rawSheet.w, rawSheet.h), h: Math.min(rawSheet.w, rawSheet.h) }
      : { w: Math.min(rawSheet.w, rawSheet.h), h: Math.max(rawSheet.w, rawSheet.h) };
  const printableMm = {
    w: sheet.w - SHEET_MARGIN_MM * 2,
    h: sheet.h - SHEET_MARGIN_MM * 2,
  };
  let rawDenominator = 1;
  for (const plate of lay.plates) {
    const extent = plateExtent(ast, lay, plate.level);
    rawDenominator = Math.max(
      rawDenominator,
      (extent.w * 1000) / printableMm.w,
      (extent.h * 1000) / printableMm.h
    );
  }
  const denominator =
    SCALE_STEPS.find((step) => step >= rawDenominator) ??
    Math.ceil(rawDenominator / 250) * 250;
  const rules = EVACUATION_PROFILES[ast.compliance];
  const compliant =
    rules.maxScaleDenominator === null ||
    denominator <= rules.maxScaleDenominator;
  const standard =
    ast.compliance === "nfpa"
      ? "NFPA 170 Ch.11"
      : ast.compliance === "uae"
        ? "UAE Civil Defence"
        : "ISO 23601";
  return {
    denominator,
    sheet: ast.sheet.size,
    orientation: ast.sheet.orientation,
    printableMm,
    symbolMm: 8,
    compliant,
    note:
      `Scale 1:${denominator} on ${ast.sheet.size.toUpperCase()} (${ast.sheet.orientation}) · ` +
      `symbols 8.0 mm · ${standard} ${compliant ? "✓" : "✗"}`,
  };
}

function roomMainPoint(
  lay: FloorplanLayoutResult,
  roomIndex: number
): RoutePoint {
  const room = lay.rooms[roomIndex];
  if (!room) return { x: 0, y: 0 };
  const part = room.parts.reduce((best, candidate) =>
    candidate.w * candidate.h > best.w * best.h ? candidate : best
  );
  return { x: round(part.x + part.w / 2), y: round(part.y + part.h / 2) };
}

function openingPoint(
  opening: FloorplanLayoutResult["openings"][number]
): RoutePoint {
  return opening.vertical
    ? { x: round(opening.along), y: round((opening.lo + opening.hi) / 2) }
    : { x: round((opening.lo + opening.hi) / 2), y: round(opening.along) };
}

function samePoint(a: RoutePoint, b: RoutePoint): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

function appendOrthogonal(points: RoutePoint[], target: RoutePoint): void {
  const source = points[points.length - 1];
  if (!source || samePoint(source, target)) return;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  if (Math.abs(dx) > 1e-9 && Math.abs(dy) > 1e-9) {
    const bend =
      Math.abs(dx) >= Math.abs(dy)
        ? { x: target.x, y: source.y }
        : { x: source.x, y: target.y };
    if (!samePoint(source, bend)) points.push({ x: round(bend.x), y: round(bend.y) });
  }
  if (!samePoint(points[points.length - 1] ?? source, target)) {
    points.push({ x: round(target.x), y: round(target.y) });
  }
}

function buildChevrons(points: RoutePoint[]): Array<RoutePoint & { deg: number }> {
  const segments: Array<{
    from: RoutePoint;
    to: RoutePoint;
    start: number;
    length: number;
  }> = [];
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) continue;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length < 1e-9) continue;
    segments.push({ from, to, start: total, length });
    total += length;
  }
  if (total < 1e-9) return [];
  const distances: number[] = [];
  if (total < 2) distances.push(total / 2);
  else for (let distance = 2; distance < total; distance += 2) distances.push(distance);
  return distances.map((distance) => {
    const segment =
      segments.find(
        (candidate) =>
          distance >= candidate.start &&
          distance <= candidate.start + candidate.length + 1e-9
      ) ?? segments[segments.length - 1];
    if (!segment) return { x: 0, y: 0, deg: 0 };
    const ratio = (distance - segment.start) / segment.length;
    return {
      x: round(segment.from.x + (segment.to.x - segment.from.x) * ratio),
      y: round(segment.from.y + (segment.to.y - segment.from.y) * ratio),
      deg: round(
        (Math.atan2(
          segment.to.y - segment.from.y,
          segment.to.x - segment.from.x
        ) *
          180) /
          Math.PI
      ),
    };
  });
}

interface Anchor {
  id: string;
  point: RoutePoint;
  roomIndex?: number;
  roomId?: string;
  safetyKind?: SafetyKind;
}

function buildRoutes(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult,
  symbols: SafetySymbolGeom[],
  errors: string[]
): RouteGeom[] {
  const rooms = new Map<string, number>();
  lay.rooms.forEach((room, index) => rooms.set(key(room.floor, room.id), index));
  const signs = new Map<string, SafetySymbolGeom>();
  for (const symbol of symbols) signs.set(key(symbol.floor, symbol.id), symbol);

  const resolveAnchor = (route: EscapeRouteAst, id: string): Anchor | null => {
    const symbol = signs.get(key(route.floor, id));
    if (symbol) {
      const roomIndex =
        symbol.roomId === undefined
          ? undefined
          : rooms.get(key(route.floor, symbol.roomId));
      return {
        id,
        point: { x: symbol.x, y: symbol.y },
        roomIndex,
        roomId: symbol.roomId,
        safetyKind: symbol.kind,
      };
    }
    const roomIndex = rooms.get(key(route.floor, id));
    if (roomIndex !== undefined) {
      return {
        id,
        point: roomMainPoint(lay, roomIndex),
        roomIndex,
        roomId: lay.rooms[roomIndex]?.id,
      };
    }
    errors.push(
      `route ${route.kind} on floor ${route.floor}: unknown anchor "${id}" — ` +
        `declare that room or safety symbol first (ISO 23601 §6)`
    );
    return null;
  };

  const routes: RouteGeom[] = [];
  for (const route of ast.routes) {
    const anchors = route.anchors
      .map((id) => resolveAnchor(route, id))
      .filter((anchor): anchor is Anchor => anchor !== null);
    const firstAnchor = anchors[0];
    if (!firstAnchor || anchors.length < 2) continue;
    const points: RoutePoint[] = [{ ...firstAnchor.point }];
    const roomSequence: string[] = [];
    for (const anchor of anchors) {
      if (anchor.roomId && roomSequence[roomSequence.length - 1] !== anchor.roomId) {
        roomSequence.push(anchor.roomId);
      }
    }
    for (let index = 1; index < anchors.length; index++) {
      const previous = anchors[index - 1];
      const current = anchors[index];
      if (!previous || !current) continue;
      if (
        previous.roomIndex !== undefined &&
        current.roomIndex !== undefined &&
        previous.roomIndex !== current.roomIndex
      ) {
        const shared = lay.openings.find((opening) => {
          const endpoints = [opening.negRoom, opening.posRoom];
          return (
            endpoints.includes(previous.roomIndex) &&
            endpoints.includes(current.roomIndex)
          );
        });
        if (!shared) {
          errors.push(
            `route ${route.kind}: "${previous.roomId}" and "${current.roomId}" share no opening — ` +
              `name the room between them; the engine does not path-find (ISO 23601 §6)`
          );
        } else {
          appendOrthogonal(points, openingPoint(shared));
        }
      }
      appendOrthogonal(points, current.point);
    }
    routes.push({
      id: route.id,
      kind: route.kind,
      points,
      chevrons: buildChevrons(points),
      roomSequence,
      startAnchor: route.anchors[0] ?? "",
      endAnchor: route.anchors[route.anchors.length - 1] ?? "",
      label: route.label,
      floor: route.floor,
    });
  }
  return routes;
}

function buildSafetySymbols(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult,
  scale: EvacuationScale,
  errors: string[],
  notes: string[]
): SafetySymbolGeom[] {
  const unit = ast.unit === "ft" ? FT : 1;
  const rooms = new Map<string, FloorplanLayoutResult["rooms"][number]>();
  for (const room of lay.rooms) rooms.set(key(room.floor, room.id), room);
  const plateByFloor = new Map(lay.plates.map((plate) => [plate.level, plate]));
  const symbols: SafetySymbolGeom[] = [];

  for (const symbol of ast.safety) {
    const room = symbol.room
      ? rooms.get(key(symbol.floor, symbol.room))
      : undefined;
    if (symbol.room && !room) {
      errors.push(
        `safety ${symbol.kind} "${symbol.id}" references unknown room "${symbol.room}" on floor ${symbol.floor} ` +
          `(ISO 23601 §6)`
      );
      continue;
    }
    const offset = plateByFloor.get(symbol.floor)?.offset ?? { x: 0, y: 0 };
    let x = symbol.outside ? symbol.x * unit + offset.x : (room?.x ?? 0) + symbol.x * unit;
    let y = symbol.outside ? symbol.y * unit + offset.y : (room?.y ?? 0) + symbol.y * unit;
    if (room && symbol.side) {
      if (symbol.side === "north") y = room.y;
      if (symbol.side === "south") y = room.y + room.h;
      if (symbol.side === "west") x = room.x;
      if (symbol.side === "east") x = room.x + room.w;
    }
    const hand =
      symbol.hand ??
      (symbol.side === "west"
        ? "left"
        : symbol.side === "east"
          ? "right"
          : room && x < room.x + room.w / 2
            ? "left"
            : "right");
    const def = resolveSafetySymbol(symbol.kind, {
      hand,
      profile: ast.compliance,
    });
    let code = def.code;
    if (symbol.kind === "emergency-door-push") code = hand === "left" ? "E022" : "E023";
    if (symbol.kind === "emergency-door-slide") code = hand === "left" ? "E034" : "E033";
    symbols.push({
      kind: symbol.kind,
      id: symbol.id,
      x: round(x),
      y: round(y),
      sizeM: round((def.sheetMm * scale.denominator) / 1000),
      sheetMm: def.sheetMm,
      code,
      colour: def.colour,
      hand,
      rotate: symbol.rotate,
      label: symbol.label,
      fireClass: symbol.fireClass,
      roomId: symbol.room,
      floor: symbol.floor,
    });
  }

  if (EVACUATION_PROFILES[ast.compliance].autoNoElevator) {
    for (const item of lay.items) {
      if (item.type !== "elevator") continue;
      if (
        symbols.some(
          (symbol) => symbol.floor === item.floor && symbol.kind === "no-elevator"
        )
      ) {
        continue;
      }
      const def = SAFETY_SYMBOLS["no-elevator"];
      symbols.push({
        kind: "no-elevator",
        id: `auto-no-elevator-${item.floor}`,
        x: round(item.x + item.w / 2),
        y: round(item.y + item.h / 2),
        sizeM: round((def.sheetMm * scale.denominator) / 1000),
        sheetMm: def.sheetMm,
        code: def.code,
        colour: def.colour,
        hand: "right",
        rotate: 0,
        roomId: item.roomId,
        floor: item.floor,
        auto: true,
      });
      notes.push(
        `auto-added no-elevator marking on floor ${item.floor} (${ast.compliance === "nfpa" ? "NFPA 170 Ch.11" : "UAE Civil Defence"})`
      );
    }
  }
  return symbols;
}

function buildFireDoors(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult,
  errors: string[]
): FireDoorGeom[] {
  const roomIndex = new Map<string, number>();
  lay.rooms.forEach((room, index) => roomIndex.set(key(room.floor, room.id), index));
  const used = new Set<number>();
  const marks: FireDoorGeom[] = [];
  for (const mark of ast.fireDoors) {
    let openingIndex = -1;
    if (mark.between) {
      const a = roomIndex.get(key(mark.floor, mark.between[0]));
      const b = roomIndex.get(key(mark.floor, mark.between[1]));
      openingIndex = lay.openings.findIndex((opening, index) => {
        if (used.has(index) || opening.kind !== "door") return false;
        const endpoints = [opening.negRoom, opening.posRoom];
        return endpoints.includes(a) && endpoints.includes(b);
      });
    } else if (mark.room && mark.side) {
      const owner = roomIndex.get(key(mark.floor, mark.room));
      const room = owner === undefined ? undefined : lay.rooms[owner];
      openingIndex = lay.openings.findIndex((opening, index) => {
        if (used.has(index) || opening.kind !== "door" || opening.owner !== owner || !room) {
          return false;
        }
        if (mark.side === "north") return !opening.vertical && Math.abs(opening.along - room.y) < 0.06;
        if (mark.side === "south") return !opening.vertical && Math.abs(opening.along - (room.y + room.h)) < 0.06;
        if (mark.side === "west") return opening.vertical && Math.abs(opening.along - room.x) < 0.06;
        return opening.vertical && Math.abs(opening.along - (room.x + room.w)) < 0.06;
      });
    }
    if (openingIndex < 0) {
      errors.push(
        `${mark.kind} on floor ${mark.floor} does not match an existing door — ` +
          `declare the door first (ISO 23601 §6 structural information)`
      );
      continue;
    }
    used.add(openingIndex);
    marks.push({
      kind: mark.kind,
      opening: openingIndex,
      rating: mark.rating,
      floor: mark.floor,
    });
  }
  return marks;
}

function symmetricDifferenceSize(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  let size = 0;
  for (const value of left) if (!right.has(value)) size++;
  for (const value of right) if (!left.has(value)) size++;
  return size;
}

function isBilingual(label: string | undefined): boolean {
  if (!label) return false;
  const halves = label.split(" / ");
  return halves.length >= 2 && halves.every((half) => half.trim().length > 0);
}

export function validateEvacuation(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult,
  profile: CompliancePolicy = ast.compliance
): { errors: string[]; warnings: string[] } {
  const data = lay.evacuation;
  if (!data) return { errors: [], warnings: [] };
  const rules = EVACUATION_PROFILES[profile];
  const errors: string[] = [];
  const warnings: string[] = [];
  const symbolsById = new Map(
    data.symbols.map((symbol) => [key(symbol.floor, symbol.id), symbol])
  );

  for (const plate of lay.plates) {
    const level = plate.level;
    const floorSymbols = data.symbols.filter((symbol) => symbol.floor === level);
    const floorRoutes = data.routes.filter((route) => route.floor === level);

    if (!floorSymbols.some((symbol) => symbol.kind === "here")) {
      errors.push(
        `floor ${level} has no "here" marker — ISO 23601 §6 requires the viewer's own position on every posted sheet; add "here in <room> at x,y"`
      );
    }
    if (
      !floorSymbols.some(
        (symbol) => symbol.kind === "exit" || symbol.kind === "exit-final"
      )
    ) {
      errors.push(
        `floor ${level} has no exit — add "exit-final <id> in <room> at x,y side <wall>" (ISO 23601 §6 / NFPA 170 Ch.11)`
      );
    }

    let independent = false;
    for (let i = 0; i < floorRoutes.length; i++) {
      for (let j = i + 1; j < floorRoutes.length; j++) {
        const a = floorRoutes[i];
        const b = floorRoutes[j];
        if (!a || !b) continue;
        if (
          a.endAnchor !== b.endAnchor &&
          symmetricDifferenceSize(a.roomSequence, b.roomSequence) >= 2
        ) {
          independent = true;
        }
      }
    }
    if (!independent) {
      const message =
        `floor ${level} has fewer than two independent escape routes from "here" — add a secondary route to a different final exit ` +
        `(ISO 23601 §6${profile === "nfpa" ? " / NFPA 101 §7.4.1" : ""})`;
      if (rules.twoRoutesSeverity === "error") errors.push(message);
      else warnings.push(message);
    }

    const routedRooms = new Set(floorRoutes.flatMap((route) => route.roomSequence));
    for (const roomIndex of plate.roomIdx) {
      const room = lay.rooms[roomIndex];
      if (!room) continue;
      const connected = lay.openings.some(
        (opening) =>
          opening.negRoom === roomIndex || opening.posRoom === roomIndex
      );
      if (!connected) continue;
      const ownsExit = floorSymbols.some(
        (symbol) =>
          symbol.roomId === room.id &&
          (symbol.kind === "exit" || symbol.kind === "exit-final")
      );
      if (!routedRooms.has(room.id) && !ownsExit) {
        warnings.push(
          `room "${room.id}" on floor ${level} is not on any escape route and has no exit — occupants there have no marked way out (ISO 23601 §6)`
        );
      }
    }

    for (const route of floorRoutes) {
      const destination = symbolsById.get(key(level, route.endAnchor));
      if (
        !destination ||
        !["exit", "exit-final", "assembly"].includes(destination.kind)
      ) {
        errors.push(
          `route ${route.kind} "${route.id}" on floor ${level} does not terminate at an exit or assembly point — ` +
            `change its last anchor to an exit-final symbol (ISO 23601 §6 / NFPA 170 Ch.11)`
        );
      }
    }
  }

  for (let i = 0; i < data.symbols.length; i++) {
    const a = data.symbols[i];
    if (!a) continue;
    if (
      rules.minSymbolMm !== null &&
      a.sheetMm < rules.minSymbolMm
    ) {
      warnings.push(
        `safety symbol "${a.id}" is ${a.sheetMm} mm, below the ${rules.minSymbolMm} mm legibility floor (ISO 23601 §7)`
      );
    }
    for (let j = i + 1; j < data.symbols.length; j++) {
      const b = data.symbols[j];
      if (!b || a.floor !== b.floor) continue;
      if (
        Math.abs(a.x - b.x) + 1e-9 < (a.sizeM + b.sizeM) / 2 &&
        Math.abs(a.y - b.y) + 1e-9 < (a.sizeM + b.sizeM) / 2
      ) {
        warnings.push(
          `safety symbols "${a.id}" and "${b.id}" overlap at their fixed printed size — separate them or split the sheet (ISO 23601 §6 symbol legibility)`
        );
      }
    }
  }

  if (rules.requireBilingual) {
    const mustLabel = new Set<SafetyKind>([
      "exit",
      "exit-final",
      "assembly",
      "not-an-exit",
    ]);
    for (const symbol of data.symbols) {
      if (
        symbol.auto ||
        (!mustLabel.has(symbol.kind) && symbol.label === undefined)
      ) {
        continue;
      }
      if (!isBilingual(symbol.label)) {
        errors.push(
          `compliance uae requires bilingual English / Arabic labels — "${symbol.kind} ${symbol.id}" has ` +
            `${symbol.label ? `only "${symbol.label}"` : "no label"}; use e.g. "EXIT / مخرج" (UAE Civil Defence evacuation-plan guidance)`
        );
      }
    }
  }

  if (
    rules.maxScaleDenominator !== null &&
    data.scale.denominator > rules.maxScaleDenominator
  ) {
    errors.push(
      `computed scale 1:${data.scale.denominator} is coarser than the 1:${rules.maxScaleDenominator} floor — ` +
        `use a larger sheet, split the plan by floor, or reduce the plotted extent (ISO 23601 §5.2)`
    );
  }

  return { errors, warnings };
}

export function finalizeEvacuationLayout(
  ast: FloorplanAst,
  lay: FloorplanLayoutResult
): FloorplanLayoutResult {
  lay.mode = "evacuation";
  if (lay.north === undefined) lay.north = 0;
  const scale = computeEvacuationScale(ast, lay);
  const errors: string[] = [];
  const notes: string[] = [];
  const symbols = buildSafetySymbols(ast, lay, scale, errors, notes);
  const routes = buildRoutes(ast, lay, symbols, errors);
  const fireDoors = buildFireDoors(ast, lay, errors);
  const evacuation: EvacuationLayoutData = {
    profile: ast.compliance,
    scale,
    symbols,
    routes,
    fireDoors,
    legend: {
      mode: "on",
      title: "Legend",
      position: "bottom-inline",
      columns: 1,
      sections: [],
      items: [],
    },
    showFurniture: ast.showFurniture,
    notes,
  };
  lay.evacuation = evacuation;
  evacuation.legend = applyLegendOverrides(
    buildEvacuationLegend(ast, lay),
    ast.legendOverrides
  );
  // Tier M stays mandatory even when an override hides every individual item.
  evacuation.legend.mode = "on";

  const validation = validateEvacuation(ast, lay, ast.compliance);
  lay.errors.push(...errors, ...validation.errors);
  lay.warnings.push(...validation.warnings);

  for (const symbol of symbols) {
    const half = symbol.sizeM / 2;
    lay.bounds.minX = Math.min(lay.bounds.minX, symbol.x - half);
    lay.bounds.minY = Math.min(lay.bounds.minY, symbol.y - half);
    lay.bounds.maxX = Math.max(lay.bounds.maxX, symbol.x + half);
    lay.bounds.maxY = Math.max(lay.bounds.maxY, symbol.y + half);
  }
  return lay;
}
