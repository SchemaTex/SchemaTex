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

// ─── Public API ─────────────────────────────────────────────

export function renderIndividualSymbol(
  individual: Individual,
  x: number,
  y: number,
  size: number
): string {
  const half = size / 2;
  const classes = [
    "lineage-genogram-node",
    `lineage-genogram-${individual.sex === "other" ? "unknown" : individual.sex}`,
  ];
  if (individual.status === "deceased") classes.push("lineage-genogram-deceased");

  const titleText = formatTitle(individual);
  const children: string[] = [title(titleText)];

  // Index person: outer gold border (concentric shape, slightly larger)
  const isIndex = individual.markers?.includes("index-person");
  if (isIndex) {
    children.push(indexBorder(individual.sex, half));
    classes.push("lineage-genogram-index-person");
  }

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

  // Age display inside node
  const ageToShow = individual.age ?? calcAge(individual);
  if (ageToShow !== undefined) {
    children.push(
      text(
        {
          x: 0,
          y: 5,
          class: "lineage-genogram-age",
          "text-anchor": "middle",
          "font-size": "11",
        },
        String(ageToShow)
      )
    );
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

export function getRequiredDefs(individuals: Individual[], includeArrowMarker = false): string {
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
      el("clipPath", { id: "lineage-genogram-clip-half-left-rect" }, [
        rect({ x: "0", y: "0", width: "50%", height: "100%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-half-left-circle" }, [
        rect({ x: "-50", y: "-50", width: "50", height: "100" }),
      ])
    );
  }

  if (neededFills.has("half-right")) {
    children.push(
      el("clipPath", { id: "lineage-genogram-clip-half-right-rect" }, [
        rect({ x: "50%", y: "0", width: "50%", height: "100%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-half-right-circle" }, [
        rect({ x: "0", y: "-50", width: "50", height: "100" }),
      ])
    );
  }

  if (neededFills.has("half-bottom")) {
    children.push(
      el("clipPath", { id: "lineage-genogram-clip-half-bottom-rect" }, [
        rect({ x: "0", y: "50%", width: "100%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-half-bottom-circle" }, [
        rect({ x: "-50", y: "0", width: "100", height: "50" }),
      ])
    );
  }

  if (neededFills.has("quarter")) {
    children.push(
      el("clipPath", { id: "lineage-genogram-clip-quarter-rect" }, [
        rect({ x: "0", y: "0", width: "50%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-quarter-circle" }, [
        rect({ x: "-50", y: "-50", width: "50", height: "50" }),
      ])
    );
  }

  if (neededFills.has("half-top")) {
    children.push(
      el("clipPath", { id: "lineage-genogram-clip-half-top-rect" }, [
        rect({ x: "0", y: "0", width: "100%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-half-top-circle" }, [
        rect({ x: "-50", y: "-50", width: "100", height: "50" }),
      ])
    );
  }

  if (neededFills.has("quad-tl")) {
    children.push(
      el("clipPath", { id: "lineage-genogram-clip-quad-tl-rect" }, [
        rect({ x: "0", y: "0", width: "50%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-quad-tl-circle" }, [
        rect({ x: "-50", y: "-50", width: "50", height: "50" }),
      ])
    );
  }

  if (neededFills.has("quad-tr")) {
    children.push(
      el("clipPath", { id: "lineage-genogram-clip-quad-tr-rect" }, [
        rect({ x: "50%", y: "0", width: "50%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-quad-tr-circle" }, [
        rect({ x: "0", y: "-50", width: "50", height: "50" }),
      ])
    );
  }

  if (neededFills.has("quad-bl")) {
    children.push(
      el("clipPath", { id: "lineage-genogram-clip-quad-bl-rect" }, [
        rect({ x: "0", y: "50%", width: "50%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-quad-bl-circle" }, [
        rect({ x: "-50", y: "0", width: "50", height: "50" }),
      ])
    );
  }

  if (neededFills.has("quad-br")) {
    children.push(
      el("clipPath", { id: "lineage-genogram-clip-quad-br-rect" }, [
        rect({ x: "50%", y: "50%", width: "50%", height: "50%" }),
      ]),
      el("clipPath", { id: "lineage-genogram-clip-quad-br-circle" }, [
        rect({ x: "0", y: "0", width: "50", height: "50" }),
      ])
    );
  }

  if (neededFills.has("striped")) {
    children.push(
      pattern(
        {
          id: "lineage-genogram-pattern-striped",
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

  if (neededFills.has("dotted")) {
    children.push(
      pattern(
        {
          id: "lineage-genogram-pattern-dotted",
          patternUnits: "userSpaceOnUse",
          width: "6",
          height: "6",
        },
        [
          circle({ cx: "3", cy: "3", r: "1", fill: "#333" }),
        ]
      )
    );
  }

  if (includeArrowMarker) {
    children.push(
      el("marker", {
        id: "lineage-genogram-arrow",
        viewBox: "0 0 10 10",
        refX: "10",
        refY: "5",
        markerWidth: "6",
        markerHeight: "6",
        orient: "auto",
      }, [
        path({ d: "M 0 0 L 10 5 L 0 10 z", fill: "#333" }),
      ])
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

function calcAge(ind: Individual): number | undefined {
  if (!ind.birthYear) return undefined;
  if (ind.deathYear) return ind.deathYear - ind.birthYear;
  if (ind.status === "deceased") return undefined;
  return undefined;
}

function indexBorder(sex: Individual["sex"], half: number): string {
  const outer = half + 4;
  switch (sex) {
    case "male":
      return rect({
        x: -outer,
        y: -outer,
        width: outer * 2,
        height: outer * 2,
        class: "lineage-genogram-index-border",
      });
    case "female":
      return circle({
        cx: 0,
        cy: 0,
        r: outer,
        class: "lineage-genogram-index-border",
      });
    case "unknown":
    case "other":
    case "nonbinary":
    case "intersex":
      return polygon({
        points: `0,${-outer} ${outer},0 0,${outer} ${-outer},0`,
        class: "lineage-genogram-index-border",
      });
  }
}

function baseShape(sex: Individual["sex"], half: number): string {
  switch (sex) {
    case "male":
      return rect({
        x: -half,
        y: -half,
        width: half * 2,
        height: half * 2,
        class: "lineage-genogram-shape",
      });
    case "female":
      return circle({
        cx: 0,
        cy: 0,
        r: half,
        class: "lineage-genogram-shape",
      });
    case "unknown":
    case "other":
    case "nonbinary":
    case "intersex":
      return polygon({
        points: `0,${-half} ${half},0 0,${half} ${-half},0`,
        class: "lineage-genogram-shape",
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
      class: "lineage-genogram-deceased-mark",
      stroke: "#333",
      "stroke-width": "2",
    }),
    line({
      x1: extend,
      y1: -extend,
      x2: -extend,
      y2: extend,
      class: "lineage-genogram-deceased-mark",
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
    attrs.fill = "url(#lineage-genogram-pattern-striped)";
  } else if (cond.fill === "dotted") {
    attrs.fill = "url(#lineage-genogram-pattern-dotted)";
  } else {
    const clipSuffix = sex === "female" ? "circle" : "rect";
    attrs["clip-path"] = `url(#lineage-genogram-clip-${cond.fill}-${clipSuffix})`;
    attrs.fill = fillColor;
  }

  attrs.class = `lineage-genogram-condition-fill lineage-genogram-condition-${cond.label}`;

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
