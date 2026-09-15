import type { Individual, Condition } from "../../core/types";
import {
  el,
  group,
  rect,
  circle,
  polygon,
  line,
  text,
  title,
  defs,
  pattern,
  path,
} from "../../core/svg";

interface StatusSymbol {
  scale: number;
  shape?: Individual["shape"];
  marks: (sex: Individual["sex"], half: number) => string[];
}

const PLAIN_SYMBOL: StatusSymbol = { scale: 1, marks: () => [] };
const STATUS_SYMBOLS: Partial<Record<Individual["status"], StatusSymbol>> = {
  deceased: { scale: 1, marks: deceasedOverlay },
  stillborn: { scale: 0.5, shape: "square", marks: (_sex, half) => crossMark(half, "stillbirth-cross") },
  miscarriage: { ...PLAIN_SYMBOL, scale: 0.3, shape: "circle" },
  abortion: { scale: 0.3, marks: (_sex, half) => crossMark(half, "abortion-cross") },
  pregnancy: { ...PLAIN_SYMBOL, scale: 0.5, shape: "triangle" },
};

const SEX_SHAPES: Record<Individual["sex"], NonNullable<Individual["shape"]>> = {
  male: "square", female: "circle", unknown: "diamond", other: "diamond",
  nonbinary: "diamond", intersex: "diamond",
};

// ─── Public API ─────────────────────────────────────────────

/** Fixed perimeter contract used for attachment and occupied symbol bounds. */
export function individualPerimeter(individual: Individual, size: number): { half: number; shape: NonNullable<Individual["shape"]> } {
  // This is a layout contract, not the painted silhouette. Keep all existing
  // attachment coordinates and occupied boxes when changing the notation.
  const scale = individual.status === "miscarriage" ? 0.3
    : ["stillborn", "pregnancy"].includes(individual.status) ? 0.5 : 1;
  return {
    half: size / 2 * scale + (individual.markers?.includes("index-person") ? 4 : 0),
    shape: ["miscarriage", "pregnancy"].includes(individual.status) ? "triangle"
      : individual.shape ?? SEX_SHAPES[individual.sex],
  };
}

export function renderIndividualSymbol(
  individual: Individual,
  x: number,
  y: number,
  size: number,
  asOf?: number,
  attachments: readonly { x: number; y: number }[] = []
): string {
  const treatment = STATUS_SYMBOLS[individual.status] ?? PLAIN_SYMBOL;
  const half = size / 2 * treatment.scale;
  const isUnknownSiblings = individual.markers?.includes("unknown-siblings");
  const isQuestionMark = !individual.shape && !treatment.shape && individual.status !== "abortion"
    && !isUnknownSiblings && (individual.sex === "unknown" || individual.sex === "other");
  // A rounded rectangular frame supports fills, index outlines and external dashes;
  // the question mark identifies sex, without borrowing the pet's diamond.
  const shape: PaintedShape = isQuestionMark ? "unknown-frame" : treatment.shape ?? individual.shape;
  const needsFrame = individual.conditions?.length || individual.markers?.includes("index-person") || individual.external;
  const ageToShow = individual.age ?? calcAge(individual, asOf);
  const classes = [
    "schematex-genogram-node",
    `schematex-genogram-${individual.status}`,
    `schematex-genogram-${individual.sex === "other" ? "unknown" : individual.sex}`,
  ];

  const titleText = formatTitle(individual);
  if (individual.external) classes.push("schematex-genogram-external");
  const children: string[] = [title(titleText)];

  // Index person: outer gold border (concentric shape, slightly larger)
  const isIndex = individual.markers?.includes("index-person");
  if (isIndex) {
    children.push(baseShape(individual.sex, half + 4, shape, { class: "schematex-genogram-index-border" }));
    classes.push("schematex-genogram-index-person");
  }

  // Abortion has an X alone, without a surrounding gender shape.
  if (individual.status !== "abortion" && (!isQuestionMark || needsFrame)) children.push(baseShape(individual.sex, half, shape, {
    "stroke-dasharray": individual.external ? "4,3" : undefined,
  }));

  // Condition fills
  if (individual.conditions?.length) {
    for (const cond of individual.conditions) {
      children.push(conditionFillElement(individual.sex, half, cond, shape));
    }
    children.push(baseShape(individual.sex, half, shape, {
      class: "schematex-genogram-condition-outline",
      "stroke-dasharray": isQuestionMark && individual.external ? "4,3" : undefined,
    }));
  }

  // The abortion X is smaller than its reserved attachment box. Finish each
  // existing connection inside that box; the layout's route/port stays fixed.
  if (individual.status === "abortion") {
    for (const point of attachments) children.push(line({
      x1: point.x, y1: point.y, x2: 0, y2: 0,
      class: "schematex-genogram-status-attachment", "data-mark": "status-attachment",
    }));
  }

  // Status marks follow the fills so they remain visible.
  children.push(...treatment.marks(individual.sex, half));

  if (isQuestionMark) {
    children.push(text({
      x: 0, y: ageToShow === undefined ? half * (needsFrame ? 0.75 : 0.95) : 0,
      class: "schematex-genogram-unknown-mark",
      "text-anchor": "middle",
      "font-size": half * (ageToShow === undefined ? (needsFrame ? 2.15 : 2.7) : 1.3),
      "data-contrast": ageContrastClass(individual) ?? "halo",
    }, "?"));
  }

  // Stack the question mark above the age, keeping both inside the existing box.
  // Age display inside node
  if (ageToShow !== undefined) {
    children.push(
      text(
        {
          x: 0,
          y: isQuestionMark ? half * 0.85 : 5,
          class: "schematex-genogram-age",
          "text-anchor": "middle",
          "font-size": "11",
          "data-contrast": ageContrastClass(individual),
        },
        String(ageToShow)
      )
    );
  }

  // Unknown-siblings glyph: bold "?" centered in the diamond.
  // Drawn after the base shape so the question mark sits on top.
  if (isUnknownSiblings) {
    classes.push("schematex-genogram-unknown-siblings");
    children.push(
      text(
        {
          x: 0,
          y: 5,
          class: "schematex-genogram-unknown-siblings-mark",
          "text-anchor": "middle",
          "font-size": "16",
          "font-weight": "bold",
        },
        "?"
      )
    );
  }

  return group(
    {
      class: classes.join(" "),
      "data-individual-id": individual.id,
      "data-status": individual.status,
      transform: `translate(${x}, ${y})`,
    },
    children
  );
}

export function getRequiredDefs(individuals: Individual[]): string {
  const neededFills = new Set<string>();
  for (const ind of individuals) {
    if (ind.conditions) {
      for (const cond of ind.conditions) {
        neededFills.add(cond.fill);
      }
    }
  }

  const children: string[] = [];

  // All clipPaths use clipPathUnits="objectBoundingBox" so a single clip works
  // for any base shape (rect, circle, diamond) regardless of its size: the
  // rect coordinates are interpreted as fractions (0..1) of the clipped
  // element's bounding box. Both the legacy `-rect` and `-circle` ids point
  // at structurally identical clips — kept under both names for backwards
  // compatibility with conditionFillElement's `${cond.fill}-${clipSuffix}` ref.
  function quadClips(suffix: string, x: number, y: number, w: number, h: number) {
    const r = rect({ x, y, width: w, height: h });
    children.push(
      el(
        "clipPath",
        { id: `schematex-genogram-clip-${suffix}-rect`, clipPathUnits: "objectBoundingBox" },
        [r]
      ),
      el(
        "clipPath",
        { id: `schematex-genogram-clip-${suffix}-circle`, clipPathUnits: "objectBoundingBox" },
        [r]
      )
    );
  }

  if (neededFills.has("half-left"))   quadClips("half-left",   0,   0,   0.5, 1);
  if (neededFills.has("half-right"))  quadClips("half-right",  0.5, 0,   0.5, 1);
  if (neededFills.has("half-top"))    quadClips("half-top",    0,   0,   1,   0.5);
  if (neededFills.has("half-bottom")) quadClips("half-bottom", 0,   0.5, 1,   0.5);
  if (neededFills.has("quarter"))     quadClips("quarter",     0,   0,   0.5, 0.5);
  if (neededFills.has("quad-tl"))     quadClips("quad-tl",     0,   0,   0.5, 0.5);
  if (neededFills.has("quad-tr"))     quadClips("quad-tr",     0.5, 0,   0.5, 0.5);
  if (neededFills.has("quad-bl"))     quadClips("quad-bl",     0,   0.5, 0.5, 0.5);
  if (neededFills.has("quad-br"))     quadClips("quad-br",     0.5, 0.5, 0.5, 0.5);

  if (neededFills.has("striped")) {
    children.push(
      pattern(
        {
          id: "schematex-genogram-pattern-striped",
          patternUnits: "userSpaceOnUse",
          width: "4",
          height: "4",
        },
        [
          path({
            d: "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2",
            class: "schematex-genogram-pattern-hatch",
          }),
        ]
      )
    );
  }

  if (neededFills.has("dotted")) {
    children.push(
      pattern(
        {
          id: "schematex-genogram-pattern-dotted",
          patternUnits: "userSpaceOnUse",
          width: "6",
          height: "6",
        },
        [
          circle({ cx: "3", cy: "3", r: "1", class: "schematex-genogram-pattern-dot" }),
        ]
      )
    );
  }

  return defs(children);
}

// ─── Internal helpers ───────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTitle(ind: Individual): string {
  const name = capitalize(ind.label || ind.id);
  if (ind.birthYear && ind.deathYear) {
    return `${name} (${ind.birthYear}-${ind.deathYear})`;
  }
  if (ind.birthYear) {
    return `${name} (${ind.birthYear})`;
  }
  return name;
}

function calcAge(ind: Individual, asOf?: number): number | undefined {
  if (ind.birthYear === undefined) return undefined;
  const endYear = ind.status === "deceased" ? ind.deathYear : ind.status === "alive" ? asOf : undefined;
  return endYear === undefined ? undefined : endYear - ind.birthYear;
}

function ageContrastClass(ind: Individual): string | undefined {
  if (!ind.conditions?.length) {
    return ind.status === "deceased" ? "halo" : undefined;
  }
  // Documented condition colours are hex. A contrasting outline also protects
  // the numeral where half/quarter fills, patterns or the deceased cross meet.
  const dark = ind.conditions.some(condition => {
    if (!condition.color) return true;
    const hex = condition.color.replace(/^#/, "");
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return true;
    const rgb = hex.length === 3 ? [...hex].map(c => c + c).join("") : hex;
    const [r, g, b] = [0, 2, 4].map(i => {
      const c = parseInt(rgb.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.179;
  });
  return dark ? "on-dark" : "halo";
}

type PaintedShape = Individual["shape"] | "unknown-frame";

function baseShape(
  sex: Individual["sex"],
  half: number,
  shape?: PaintedShape,
  attrs: Record<string, string | number | undefined> = {}
): string {
  const style = { class: "schematex-genogram-shape", ...attrs };
  switch (shape ?? SEX_SHAPES[sex]) {
    case "unknown-frame":
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, rx: half * 0.3, ...style });
    case "square":
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, ...style });
    case "circle":
      return circle({ cx: 0, cy: 0, r: half, ...style });
    case "diamond":
      return polygon({ points: `0,${-half} ${half},0 0,${half} ${-half},0`, ...style });
    case "triangle":
      return polygon({ points: `0,${-half} ${half},${half} ${-half},${half}`, ...style });
    case "triangle-down":
      return polygon({ points: `${-half},${-half} ${half},${-half} 0,${half}`, ...style });
  }
}

function deceasedOverlay(sex: Individual["sex"], half: number): string[] {
  const extend = sex === "female" ? half * 0.707 : half;
  // Paint both white under-strokes before the coloured cross.
  return ["halo", "mark"].flatMap(layer => [1, -1].map(direction => line({
    x1: -extend * direction, y1: -extend, x2: extend * direction, y2: extend,
    class: `schematex-genogram-deceased-${layer}`,
  })));
}

function conditionFillElement(
  sex: Individual["sex"],
  half: number,
  cond: Condition,
  shape?: PaintedShape
): string {
  const fillColor = cond.color;
  const attrs: Record<string, string | number | undefined> = {};

  if (cond.fill === "full") {
    attrs.fill = fillColor;
  } else if (cond.fill === "striped") {
    attrs.fill = "url(#schematex-genogram-pattern-striped)";
  } else if (cond.fill === "dotted") {
    attrs.fill = "url(#schematex-genogram-pattern-dotted)";
  } else {
    const clipSuffix = sex === "female" ? "circle" : "rect";
    attrs["clip-path"] = `url(#schematex-genogram-clip-${cond.fill}-${clipSuffix})`;
    attrs.fill = fillColor;
  }

  attrs.class = `schematex-genogram-condition-fill schematex-genogram-condition-${cond.label}`;

  return baseShape(sex, half, shape, attrs);
}

function crossMark(half: number, mark: string): string[] {
  return [1, -1].map(direction => line({
    x1: -half * direction, y1: -half, x2: half * direction, y2: half,
    class: "schematex-genogram-status-cross", "data-mark": mark,
  }));
}
