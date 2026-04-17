import type { Individual, Condition } from "../../core/types";
import {
  el,
  group,
  rect,
  circle,
  polygon,
  line,
  title,
  defs,
  pattern,
  path,
} from "../../core/svg";

// ─── Public API ─────────────────────────────────────────────

export function renderIndividualSymbol(
  individual: Individual,
  x: number,
  y: number,
  size: number
): string {
  const half = size / 2;
  const classes = [
    "lineage-node",
    `lineage-${individual.sex === "other" ? "unknown" : individual.sex}`,
  ];
  if (individual.status === "deceased") classes.push("lineage-deceased");

  const titleText = formatTitle(individual);
  const children: string[] = [title(titleText)];

  // Base shape
  children.push(baseShape(individual.sex, half));

  // Condition fills
  if (individual.conditions?.length) {
    for (const cond of individual.conditions) {
      children.push(conditionFillElement(individual.sex, half, cond));
    }
  }

  // Deceased overlay
  if (individual.status === "deceased") {
    children.push(...deceasedOverlay(individual.sex, half));
  }

  return group(
    {
      class: classes.join(" "),
      "data-individual-id": individual.id,
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

  if (neededFills.has("half-left")) {
    children.push(
      el("clipPath", { id: "lineage-clip-half-left-rect" }, [
        rect({ x: "0", y: "0", width: "50%", height: "100%" }),
      ]),
      el("clipPath", { id: "lineage-clip-half-left-circle" }, [
        rect({ x: "-50", y: "-50", width: "50", height: "100" }),
      ])
    );
  }

  if (neededFills.has("half-right")) {
    children.push(
      el("clipPath", { id: "lineage-clip-half-right-rect" }, [
        rect({ x: "50%", y: "0", width: "50%", height: "100%" }),
      ]),
      el("clipPath", { id: "lineage-clip-half-right-circle" }, [
        rect({ x: "0", y: "-50", width: "50", height: "100" }),
      ])
    );
  }

  if (neededFills.has("half-bottom")) {
    children.push(
      el("clipPath", { id: "lineage-clip-half-bottom-rect" }, [
        rect({ x: "0", y: "50%", width: "100%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-clip-half-bottom-circle" }, [
        rect({ x: "-50", y: "0", width: "100", height: "50" }),
      ])
    );
  }

  if (neededFills.has("quarter")) {
    children.push(
      el("clipPath", { id: "lineage-clip-quarter-rect" }, [
        rect({ x: "0", y: "0", width: "50%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-clip-quarter-circle" }, [
        rect({ x: "-50", y: "-50", width: "50", height: "50" }),
      ])
    );
  }

  if (neededFills.has("striped")) {
    children.push(
      pattern(
        {
          id: "lineage-pattern-striped",
          patternUnits: "userSpaceOnUse",
          width: "4",
          height: "4",
        },
        [
          path({
            d: "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2",
            stroke: "#333",
            "stroke-width": "1",
          }),
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

function baseShape(sex: Individual["sex"], half: number): string {
  switch (sex) {
    case "male":
      return rect({
        x: -half,
        y: -half,
        width: half * 2,
        height: half * 2,
        class: "lineage-shape",
      });
    case "female":
      return circle({
        cx: 0,
        cy: 0,
        r: half,
        class: "lineage-shape",
      });
    case "unknown":
    case "other":
    case "nonbinary":
    case "intersex":
      return polygon({
        points: `0,${-half} ${half},0 0,${half} ${-half},0`,
        class: "lineage-shape",
      });
  }
}

function deceasedOverlay(sex: Individual["sex"], half: number): string[] {
  const extend = sex === "female" ? half * 0.707 : half;
  return [
    line({
      x1: -extend,
      y1: -extend,
      x2: extend,
      y2: extend,
      class: "lineage-deceased-mark",
      stroke: "#333",
      "stroke-width": "2",
    }),
    line({
      x1: extend,
      y1: -extend,
      x2: -extend,
      y2: extend,
      class: "lineage-deceased-mark",
      stroke: "#333",
      "stroke-width": "2",
    }),
  ];
}

function conditionFillElement(
  sex: Individual["sex"],
  half: number,
  cond: Condition
): string {
  const fillColor = cond.color ?? "#333";
  const attrs: Record<string, string | number> = {};

  if (cond.fill === "full") {
    attrs.fill = fillColor;
  } else if (cond.fill === "striped") {
    attrs.fill = "url(#lineage-pattern-striped)";
  } else {
    const clipSuffix = sex === "female" ? "circle" : "rect";
    attrs["clip-path"] = `url(#lineage-clip-${cond.fill}-${clipSuffix})`;
    attrs.fill = fillColor;
  }

  attrs.class = `lineage-condition-fill lineage-condition-${cond.label}`;

  switch (sex) {
    case "male":
      return rect({ x: -half, y: -half, width: half * 2, height: half * 2, ...attrs });
    case "female":
      return circle({ cx: 0, cy: 0, r: half, ...attrs });
    case "unknown":
    case "other":
    case "nonbinary":
    case "intersex":
    default:
      return polygon({
        points: `0,${-half} ${half},0 0,${half} ${-half},0`,
        ...attrs,
      });
  }
}
