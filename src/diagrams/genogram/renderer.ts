import { captionGeometry } from "./captions";
import { relationshipCaptions, EMOTIONAL_REL_TYPES } from "./routing";
import { relationshipPoints, renderEmotionalForm } from "./line-forms";
import type { LayoutResult, LayoutNode, LayoutEdge, RenderConfig, DiagramAST, SceneItem } from "../../core/types";
import { svgRoot, el, group, text, title, desc, escapeXml } from "../../core/svg";
import { cssCustomProperties, resolveGenogramTheme, STROKE_WIDTH } from "../../core/theme";
import { renderIndividualSymbol, getRequiredDefs } from "./symbols";
import { applyLegendOverrides, renderLegend } from "../../core/legend";
import { buildGenogramLegend, renderGenogramLegendForms } from "./legend";
import { resolveSceneTitle } from "../../core/title-scene";

// ─── Public API ─────────────────────────────────────────────

export function renderGenogram(
  layout: LayoutResult,
  config: RenderConfig,
  ast?: DiagramAST
): string {
  const defsStr = getRequiredDefs(layout.nodes.map((n) => n.individual));
  const styleStr = buildStyles(config);

  const genGroups = groupByGeneration(layout.nodes);

  // Separate structural and emotional edges
  const structuralEdges = layout.edges.filter(e => !EMOTIONAL_REL_TYPES.has(e.relationship.type));
  const emotionalEdges = layout.edges.filter(e => EMOTIONAL_REL_TYPES.has(e.relationship.type));

  const edgeLayers = renderEdges(structuralEdges, config.__scene);
  const emotionalLayer = renderEmotionalEdges(emotionalEdges, config.__scene);
  const edgeLabelLayer = renderEdgeLabels(layout, config);
  const siblingOfLayer = renderSiblingOfBrackets(layout, ast, config.__scene);

  const nodeCount = layout.nodes.length;
  const genCount = genGroups.size;

  const chartTitle = ast?.metadata?.title;

  // Adjust viewBox and add title offset if title exists
  const titleHeight = chartTitle ? 40 : 0;
  const totalHeight = layout.height + titleHeight;
  const nodeLayers = renderNodes(genGroups, titleHeight, config.__scene, ast?.metadata?.asOf === undefined ? undefined : Number(ast.metadata.asOf), layout.edges);
  const labelLayer = renderLabels(layout.nodes, config, config.__scene);

  const layers: string[] = [
    title(chartTitle ? `Genogram: ${chartTitle}` : "Genogram"),
    desc(
      `Genogram diagram with ${nodeCount} individuals across ${genCount} generations`
    ),
    ...(ast?.warnings ?? []).map(warning => el("desc", {
      "data-severity": warning.severity, "data-code": warning.code, "data-line": warning.line,
    }, escapeXml(warning.message))),
    defsStr,
    styleStr,
  ];

  // Build chart content (title + diagram) at native layout.width. We'll wrap
  // it in a horizontally-centering group AFTER the legend tells us the final
  // viewBox width.
  const chartContent: string[] = [];
  const titleScene = chartTitle
    ? resolveSceneTitle(chartTitle, ast?.titleSourceRange, layout.width / 2, 28, config)
    : undefined;
  const titleNode = chartTitle && titleScene
    ? text(
        {
          x: titleScene.x,
          y: titleScene.y,
          class: "schematex-genogram-title",
          "text-anchor": "middle",
          "font-size": "20",
          "font-weight": "bold",
          "font-family": config.fontFamily,
          ...titleScene.attrs,
        },
        chartTitle
      )
    : "";
  if (titleNode && !config.__scene) chartContent.push(titleNode);
  chartContent.push(
    group(
      { transform: titleHeight > 0 ? `translate(0, ${titleHeight})` : undefined },
      [edgeLayers, siblingOfLayer, emotionalLayer, ...nodeLayers, labelLayer, edgeLabelLayer]
    )
  );
  if (titleNode && config.__scene) chartContent.push(titleNode);

  // Compose legend (against the natural canvas size, not the centered one).
  let finalWidth = layout.width;
  let finalHeight = totalHeight;
  let legendSvg = "";
  if (ast) {
    const themeBase = resolveGenogramTheme(config.theme);
    const autoSpec = buildGenogramLegend(ast, themeBase);
    const finalSpec = applyLegendOverrides(autoSpec, ast.legendOverrides);
    if (finalSpec.mode === "on" && finalSpec.items.length > 0) {
      const { svg, bbox: lb } = renderLegend(
        finalSpec,
        {
          canvasWidth: layout.width,
          canvasHeight: totalHeight,
          padding: 16,
          titleHeight,
        },
        themeBase,
        { fontFamily: config.fontFamily, fontSize: config.fontSize }
      );
      if (svg) {
        legendSvg = renderGenogramLegendForms(svg, finalSpec);
        const overflowX = lb.x + lb.w + 8;
        const overflowY = lb.y + lb.h + 8;
        if (overflowX > finalWidth) finalWidth = overflowX;
        if (overflowY > finalHeight) finalHeight = overflowY;
      }
    }
  }

  // Center the chart horizontally inside the (possibly widened) viewBox so
  // small diagrams don't sit flush-left under a wide legend strip.
  const chartXOffset = Math.max(0, (finalWidth - layout.width) / 2);
  layers.push(
    group(
      { transform: chartXOffset > 0 ? `translate(${chartXOffset}, 0)` : undefined },
      chartContent
    )
  );
  if (legendSvg) layers.push(legendSvg);

  return svgRoot(
    {
      viewBox: `0 0 ${finalWidth} ${finalHeight}`,
      class: "schematex-diagram schematex-genogram",
      width: finalWidth,
      height: finalHeight,
    },
    layers
  );
}

// ─── Styles ─────────────────────────────────────────────────

// ─── Theme Resolution ──────────────────────────────────────

function buildStyles(config: RenderConfig): string {
  const t = resolveGenogramTheme(config.theme);
  const css = `
.schematex-genogram {${cssCustomProperties(t)}
}
.schematex-genogram-shape { fill: ${t.fill}; stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.schematex-genogram-male .schematex-genogram-shape { fill: ${t.maleFill}; }
.schematex-genogram-female .schematex-genogram-shape { fill: ${t.femaleFill}; }
.schematex-genogram-unknown .schematex-genogram-shape { fill: ${t.unknownFill}; }
.schematex-genogram-label { font-family: ${config.fontFamily}; font-size: ${config.fontSize}px; text-anchor: middle; fill: ${t.text}; }
.schematex-genogram-vitals { font-family: ${config.fontFamily}; font-size: ${Math.max(9, config.fontSize - 1)}px; text-anchor: middle; fill: ${t.textMuted}; }
.schematex-genogram-note, .schematex-genogram-annotation { font-family: ${config.fontFamily}; font-size: ${Math.max(9, config.fontSize - 1)}px; font-style: italic; text-anchor: middle; fill: ${t.textMuted}; }
.schematex-genogram-edge { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.schematex-genogram-edge-cohabiting path { stroke-dasharray: 6,4; }
.schematex-genogram-edge-cohabiting-ended path { stroke-dasharray: 6,4; }
.schematex-genogram-edge-divorced .schematex-genogram-divorce-mark { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-genogram-edge-separated .schematex-genogram-separation-mark { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-genogram-edge-cohabiting-ended .schematex-genogram-separation-mark { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; }
/* Secondary parent-child link (foster/adopted "current caregiver") — dotted, muted */
.schematex-genogram-edge-secondary path { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; stroke-dasharray: 2,4; fill: none; opacity: 0.85; }
.schematex-genogram-edge-secondary-step path { stroke-dasharray: none; }
.schematex-genogram-edge-secondary .schematex-genogram-placement-halo { stroke: ${t.fill}; stroke-width: 4.5; stroke-dasharray: none; opacity: 1; fill: none; }
/* Sibling-of bracket (known relative, unknown ancestry) — dashed */
.schematex-genogram-sibling-of path { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; stroke-dasharray: 4,3; fill: none; opacity: 0.7; }
.schematex-genogram-unknown-siblings-mark { fill: ${t.text}; pointer-events: none; }
.schematex-genogram-deceased-halo { stroke: ${t.fill}; stroke-width: 5; stroke-linecap: round; }
.schematex-genogram-status-attachment { stroke: ${t.neutral}; stroke-width: ${STROKE_WIDTH.normal}; }
.schematex-genogram-status-cross { stroke: ${t.deceasedMark}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: butt; }
.schematex-genogram-miscarriage .schematex-genogram-shape,
.schematex-genogram-pregnancy .schematex-genogram-shape { fill: none; }
.schematex-genogram-condition-outline { fill: none; stroke: ${t.stroke}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linejoin: round; }
.schematex-genogram-pattern-hatch { fill: none; stroke: ${t.stroke}; stroke-width: 1; }
.schematex-genogram-pattern-dot { fill: ${t.stroke}; }
.schematex-genogram-emotional-stroke { fill: none; stroke: currentColor; stroke-linecap: butt; stroke-linejoin: round; }
.schematex-genogram-arrow-filled { fill: currentColor; }
.schematex-genogram-ink-positive { color: ${t.positive}; }
.schematex-genogram-ink-negative { color: ${t.negative}; }
.schematex-genogram-ink-neutral { color: ${t.neutral}; }
.schematex-genogram-ink-accent { color: ${t.accent}; }
.schematex-genogram-ink-warn { color: ${t.warn}; }
.schematex-genogram-deceased-mark { stroke: ${t.deceasedMark}; stroke-width: ${STROKE_WIDTH.normal}; stroke-linecap: round; }
/* Inline fill on each .schematex-genogram-condition-fill element comes from cond.color. The CSS only sets a default for elements that did not receive an inline fill attribute. */
.schematex-genogram-condition-fill:not([fill]) { fill: ${t.conditionFill}; }
.schematex-genogram-age { font-family: ${config.fontFamily}; fill: ${t.text}; pointer-events: none; }
.schematex-genogram-unknown-mark { font-family: ${config.fontFamily}; font-weight: 400; fill: ${t.stroke}; pointer-events: none; }
.schematex-genogram-unknown-mark[data-contrast="halo"], .schematex-genogram-age[data-contrast="halo"] { stroke: ${t.fill}; stroke-width: 2; paint-order: stroke; stroke-linejoin: round; }
.schematex-genogram-unknown-mark[data-contrast="on-dark"], .schematex-genogram-age[data-contrast="on-dark"] { fill: ${t.fill}; stroke: ${t.text}; stroke-width: 2; paint-order: stroke; stroke-linejoin: round; }
.schematex-genogram-title { fill: ${t.text}; }
.schematex-genogram-edge-label { font-family: ${config.fontFamily}; fill: ${t.text}; }
.schematex-genogram-index-border { stroke: ${t.warn}; stroke-width: ${STROKE_WIDTH.thick}; fill: none; }
`;
  return el("style", {}, css);
}

// ─── Emotional Relationship Types ───────────────────────────

function renderEmotionalEdges(edges: LayoutEdge[], scene?: SceneItem[]): string {
  if (edges.length === 0) return group({ class: "schematex-genogram-emotional-edges" }, []);

  const children: string[] = [];
  for (const [index, edge] of edges.entries()) {
    const type = edge.relationship.type;
    const elements = [renderEmotionalForm(edge.path, type, edge.relationship.directional)];

    const key = `edge:emotional:${index}`;
    scene?.push({ key, kind: "edge", path: edge.path, editable: { label: false, position: "none" } });
    children.push(
      group(
        {
          "data-sx-key": scene ? key : undefined,
          class: `schematex-genogram-emotional schematex-genogram-emotional-${type}`,
          "data-from": edge.from,
          "data-to": edge.to,
          "data-sx-live-explicit": scene ? "true" : undefined,
          "data-sx-live-start": scene ? edge.from : undefined,
          "data-sx-live-end": scene ? edge.to : undefined,
          "data-sx-live-mode": scene ? "sampled" : undefined,
          "data-relationship-type": type,
        },
        elements
      )
    );
  }

  return group({ class: "schematex-genogram-emotional-edges" }, children);
}

// ─── Edge Labels ────────────────────────────────────────────

function renderEdgeLabels(layout: LayoutResult, config: RenderConfig): string {
  const labels: string[] = [];
  for (const { edge, box, leader } of relationshipCaptions(layout, config.fontSize)) {
    const elements: string[] = [];
    if (leader) elements.push(el("line", { x1: leader.from.x, y1: leader.from.y, x2: leader.to.x, y2: leader.to.y,
      stroke: resolveGenogramTheme(config.theme).neutral, "stroke-width": 1 }));
    elements.push(el("rect", { ...box, fill: "white", "fill-opacity": 0.9 }), text({
      x: box.x + box.width / 2, y: box.y + 11, class: "schematex-genogram-edge-label",
      "text-anchor": "middle", "font-size": 10, "font-family": config.fontFamily,
    }, edge.relationship.label!));
    labels.push(group({ "data-from": edge.from, "data-to": edge.to }, elements));
  }
  return group({ class: "schematex-genogram-edge-labels" }, labels);
}

// ─── Edges ──────────────────────────────────────────────────

function structuralLiveAttrs(edge: LayoutEdge, scene?: SceneItem[]): Record<string, string | undefined> {
  if (!scene) return {};
  const relationshipFrom = edge.relationship.from;
  const relationshipTo = edge.relationship.to;
  if (edge.relationship.type === "parent-child" && relationshipFrom.includes("+")) {
    const partners = relationshipFrom.split("+").filter(Boolean);
    const midpointOwners = partners.map((id) => `${id}:0.5`).join(",");
    if (relationshipTo === "_drop") {
      return {
        "data-sx-live-explicit": "true",
        "data-sx-live-all": midpointOwners,
        "data-sx-live-mode": "orthogonal",
        "data-sx-live-kind": "family-drop",
      };
    }
    if (relationshipTo === "_sibship") {
      const startOwners = edge.from.includes("+") ? midpointOwners : edge.from;
      const endOwners = edge.to.includes("+") ? midpointOwners : edge.to;
      return {
        "data-sx-live-explicit": "true",
        "data-sx-live-start": startOwners,
        "data-sx-live-end": endOwners,
        "data-sx-live-mode": "orthogonal",
        "data-sx-live-kind": "sibship",
      };
    }
    return {
      "data-sx-live-explicit": "true",
      "data-sx-live-start": midpointOwners,
      "data-sx-live-end": edge.to,
      "data-sx-live-mode": "orthogonal",
    };
  }
  return {
    "data-sx-live-explicit": "true",
    "data-sx-live-start": edge.from,
    "data-sx-live-end": edge.to,
    "data-sx-live-mode": "orthogonal",
  };
}

function structuralPublicEndpoints(edge: LayoutEdge): { from: string; to: string } {
  if (
    edge.relationship.type === "parent-child" &&
    edge.relationship.to === "_sibship" &&
    edge.relationship.from.includes("+")
  ) {
    const [from, to] = edge.relationship.from.split("+");
    if (from && to) return { from, to };
  }
  return { from: edge.from, to: edge.to };
}

function renderEdges(edges: LayoutEdge[], scene?: SceneItem[]): string {
  const children: string[] = [];

  for (const [index, edge] of edges.entries()) {
    const relType = edge.relationship.type;
    const isSecondary = edge.relationship.secondary === true;
    const cssClass = isSecondary
      ? `schematex-genogram-edge schematex-genogram-edge-secondary schematex-genogram-edge-secondary-${relType}`
      : `schematex-genogram-edge schematex-genogram-edge-${relType}`;

    // Secondary links already have two elbows from the shared route. A step
    // link without biological parents still needs its visual elbows on the
    // ordinary primary child drop; this does not change family layout.
    const edgePath = relType === "step" && !isSecondary ? stepConnector(edge.path) : edge.path;
    const elements: string[] = [
      el("path", { d: edgePath, class: "schematex-genogram-edge-path", "data-sx-live-edge": scene ? "true" : undefined }),
    ];

    if (isSecondary) {
      elements.unshift(el("path", { d: edgePath, class: "schematex-genogram-placement-halo" }));
    }

    // cohabiting-ended: single slash mark like separation
    if (relType === "cohabiting-ended" && !isSecondary) {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(
          el("line", {
            x1: mid.x - 4,
            y1: mid.y - 6,
            x2: mid.x + 4,
            y2: mid.y + 6,
            class: "schematex-genogram-separation-mark",
            "stroke-width": "2",
            "data-sx-live-midpoint": scene ? "true" : undefined,
          })
        );
      }
    }

    // Divorce markers: two short slashes at midpoint
    if (relType === "divorced") {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(
          el("line", {
            x1: mid.x - 4,
            y1: mid.y - 6,
            x2: mid.x + 4,
            y2: mid.y + 6,
            class: "schematex-genogram-divorce-mark",
            "stroke-width": "2",
            "data-sx-live-midpoint": scene ? "true" : undefined,
          }),
          el("line", {
            x1: mid.x - 4 + 6,
            y1: mid.y - 6,
            x2: mid.x + 4 + 6,
            y2: mid.y + 6,
            class: "schematex-genogram-divorce-mark",
            "stroke-width": "2",
            "data-sx-live-midpoint": scene ? "true" : undefined,
          })
        );
      }
    }

    // Separation marker: single slash
    if (relType === "separated") {
      const mid = pathMidpoint(edge.path);
      if (mid) {
        elements.push(
          el("line", {
            x1: mid.x - 4,
            y1: mid.y - 6,
            x2: mid.x + 4,
            y2: mid.y + 6,
            class: "schematex-genogram-separation-mark",
            "stroke-width": "2",
            "data-sx-live-midpoint": scene ? "true" : undefined,
          })
        );
      }
    }

    const key = `edge:structural:${index}`;
    scene?.push({ key, kind: "edge", path: edgePath, editable: { label: false, position: "none" } });
    const publicEndpoints = structuralPublicEndpoints(edge);
    children.push(
      group(
        {
          "data-sx-key": scene ? key : undefined,
          class: cssClass,
          "data-from": publicEndpoints.from,
          "data-to": publicEndpoints.to,
          ...structuralLiveAttrs(edge, scene),
        },
        elements
      )
    );
  }

  return group({ class: "schematex-genogram-edges" }, children);
}

function stepConnector(pathData: string): string {
  // Primary child drops are M/L polylines produced by layout, with at least
  // two points. Preserve their endpoints and draw exactly two right angles.
  const coordinates = pathData.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const [x1, y1] = coordinates;
  const [x2, y2] = coordinates.slice(-2);
  const midY = (y1 + y2) / 2;
  return x1 === x2
    ? `M ${x1} ${y1} L ${x1 + 12} ${y1} L ${x1 + 12} ${y2} L ${x2} ${y2}`
    : `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}

function pathMidpoint(
  pathData: string
): { x: number; y: number } | null {
  const coords = pathData.match(/[\d.-]+/g);
  if (!coords || coords.length < 4) return null;
  const x1 = parseFloat(coords[0]);
  const y1 = parseFloat(coords[1]);
  const x2 = parseFloat(coords[2]);
  const y2 = parseFloat(coords[3]);
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

// ─── Nodes ──────────────────────────────────────────────────

function groupByGeneration(nodes: LayoutNode[]): Map<number, LayoutNode[]> {
  const groups = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const gen = node.generation;
    const group = groups.get(gen) ?? [];
    group.push(node);
    groups.set(gen, group);
  }
  return groups;
}

function renderNodes(
  genGroups: Map<number, LayoutNode[]>,
  titleHeight: number,
  scene?: SceneItem[],
  asOf?: number,
  edges: readonly LayoutEdge[] = []
): string[] {
  const layers: string[] = [];
  const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);

  for (const genIdx of sortedGens) {
    const nodes = genGroups.get(genIdx) ?? [];
    const nodeElements: string[] = [];

    for (const node of nodes) {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const key = `node:${node.id}`;
      scene?.push({
        key,
        kind: "node",
        semanticId: node.id,
        label: node.individual.label,
        sourceRange: node.individual.labelSourceRange,
        bbox: { x: node.x, y: node.y + titleHeight, width: node.width, height: node.height },
        editable: { label: node.individual.labelSourceRange !== undefined, position: "move-x" },
      });
      const attachments = node.individual.status === "abortion" ? edges.flatMap(edge => {
        if (edge.from !== node.id && edge.to !== node.id) return [];
        const points = relationshipPoints(edge.path);
        const point = edge.from === node.id ? points[0] : points.at(-1);
        return point ? [{ x: point.x - cx, y: point.y - cy }] : [];
      }) : [];
      const symbol = renderIndividualSymbol(node.individual, cx, cy, node.width, asOf, attachments);
      nodeElements.push(scene
        ? group({ "data-sx-key": key, "data-sx-owner": key, "data-individual-id": node.id }, [symbol])
        : symbol);
    }

    layers.push(
      group(
        {
          class: `schematex-genogram-generation schematex-genogram-generation-${genIdx}`,
          "data-generation": genIdx,
        },
        nodeElements
      )
    );
  }

  return layers;
}

// ─── Sibling-of brackets (known relative, unknown ancestry) ────
// Drawn directly from AST + layout (not as LayoutEdges) so the synthetic
// edge type doesn't pollute structural / emotional / secondary classifiers.
// Cross-generation references are skipped — `siblingOf` is generationally
// pinned by `assignGenerations`, so a mismatch here means user error or a
// missing referent, both of which we silently no-op rather than misdraw.

function renderSiblingOfBrackets(
  layout: LayoutResult,
  ast?: DiagramAST,
  scene?: SceneItem[]
): string {
  if (!ast) return group({ class: "schematex-genogram-sibling-of-edges" }, []);
  const elements: string[] = [];
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n] as const));

  let edgeIndex = 0;
  for (const ind of ast.individuals) {
    if (!ind.siblingOf) continue;
    const fromNode = nodeById.get(ind.id);
    const toNode = nodeById.get(ind.siblingOf);
    if (!fromNode || !toNode) continue;
    if (fromNode.generation !== toNode.generation) continue;

    const fromCx = fromNode.x + fromNode.width / 2;
    const fromTopY = fromNode.y;
    const toCx = toNode.x + toNode.width / 2;
    const toTopY = toNode.y;
    const bracketY = Math.min(fromTopY, toTopY) - 12;

    const path =
      `M ${fromCx} ${fromTopY} L ${fromCx} ${bracketY}` +
      ` L ${toCx} ${bracketY} L ${toCx} ${toTopY}`;
    const key = `edge:sibling-of:${edgeIndex++}`;
    scene?.push({ key, kind: "edge", path, editable: { label: false, position: "none" } });
    elements.push(
      group(
        {
          "data-sx-key": scene ? key : undefined,
          class: "schematex-genogram-sibling-of",
          "data-from": ind.id,
          "data-to": ind.siblingOf,
          "data-sx-live-explicit": scene ? "true" : undefined,
          "data-sx-live-start": scene ? ind.id : undefined,
          "data-sx-live-end": scene ? ind.siblingOf : undefined,
          "data-sx-live-mode": scene ? "orthogonal" : undefined,
        },
        [el("path", { d: path, "data-sx-live-edge": scene ? "true" : undefined })]
      )
    );
  }

  return group({ class: "schematex-genogram-sibling-of-edges" }, elements);
}

function renderLabels(
  nodes: LayoutNode[],
  config: RenderConfig,
  scene?: SceneItem[]
): string {
  const labels: string[] = [];

  for (const node of nodes) {
    const ind = node.individual;
    for (const [index, caption] of captionGeometry(node, config.fontSize).entries()) {
      labels.push(text({
        x: caption.x,
        y: caption.y,
        class: `schematex-genogram-${caption.kind}`,
        "data-individual-id": ind.id,
        "data-sx-owner": scene ? `node:${ind.id}` : undefined,
        "data-sx-role": scene && index === 0 && ind.labelSourceRange ? "label" : undefined,
      }, caption.text));
    }
  }

  return group({ class: "schematex-genogram-labels" }, labels);
}
