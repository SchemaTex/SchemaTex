import { setLabel, setPosition } from "./core/editing";
import type { SceneItem } from "./core/types";

export interface InteractionScene {
  /** Use sourceRevision(source) so stale preview/source pairs are rejected. */
  rev: number;
  items: SceneItem[];
}

export interface LabelEditAnchor {
  /** Screen-space glyph bounds, including CSS zoom and responsive SVG scaling. */
  rect: DOMRect;
  /** Re-measure after scrolling or viewport changes so a fixed editor stays over the glyph. */
  measureRect?: () => DOMRect;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  letterSpacing: string;
  color: string;
}

export interface InteractionOptions {
  getSource: () => string;
  getScene: () => InteractionScene;
  onSelect?: (item: SceneItem | null) => void;
  onRequestLabelEdit?: (
    item: SceneItem,
    anchor: LabelEditAnchor,
    commit: (text: string) => void,
    cancel: () => void
  ) => void;
  onSourceChange: (newSource: string, reason: "label" | "position") => void;
}

interface PathPoint {
  x: number;
  y: number;
  t: number;
}

interface LiveEdgePreview {
  path: SVGPathElement;
  basePath: string;
  points: PathPoint[];
  mode: "sampled" | "orthogonal" | "quadratic";
  startWeight: number;
  endWeight: number;
  allWeight: number;
  labelGroup: SVGGElement | null;
  baseLabelTransform: string | null;
  midpointElements: Array<{ element: SVGGraphicsElement; baseTransform: string | null }>;
}

interface DragState {
  pointerId: number;
  item: SceneItem;
  element: SVGElement;
  startClientX: number;
  startClientY: number;
  startSvgX: number;
  startSvgY: number;
  baseTransform: string;
  linkedElements: Array<{ element: SVGElement; baseTransform: string }>;
  liveEdges: LiveEdgePreview[];
  moved: boolean;
}

const DRAG_THRESHOLD = 4;

/** Stable, inexpensive revision for matching a scene to its exact source. */
export function sourceRevision(source: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function eventElement(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null;
}

function sceneItemFor(
  target: Element | null,
  items: SceneItem[],
  options: { preferOwner?: boolean } = {}
): {
  item: SceneItem;
  element: SVGElement;
} | null {
  const keyed = target?.closest<SVGElement>("[data-sx-key]");
  const owned = target?.closest<SVGElement>("[data-sx-owner]");
  const element = options.preferOwner ? owned ?? keyed : keyed ?? owned;
  const key = options.preferOwner
    ? owned?.getAttribute("data-sx-owner") ?? keyed?.getAttribute("data-sx-key")
    : keyed?.getAttribute("data-sx-key") ?? owned?.getAttribute("data-sx-owner");
  if (!key || !element) return null;
  const item = items.find((candidate) => candidate.key === key);
  return item ? { item, element } : null;
}

function pointInSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const mapped = point.matrixTransform(matrix.inverse());
  return { x: mapped.x, y: mapped.y };
}

function fmt(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function influenceWeight(value: string | null, semanticId: string): number {
  if (!value) return 0;
  for (const entry of value.split(",")) {
    const [id, weightText] = entry.trim().split(":");
    if (id !== semanticId) continue;
    const weight = weightText === undefined ? 1 : Number(weightText);
    return Number.isFinite(weight) ? weight : 0;
  }
  return 0;
}

function parseOrthogonalPath(path: string): Array<{ x: number; y: number }> | null {
  const command = /([ML])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))[,\s]+([+-]?(?:\d+(?:\.\d*)?|\.\d+))/gi;
  const points: Array<{ x: number; y: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = command.exec(path))) {
    points.push({ x: Number(match[2]), y: Number(match[3]) });
  }
  return points.length >= 2 ? points : null;
}

function compactOrthogonalPoints(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const unique: Array<{ x: number; y: number }> = [];
  for (const point of points) {
    const previous = unique[unique.length - 1];
    if (!previous || Math.abs(previous.x - point.x) >= 0.1 || Math.abs(previous.y - point.y) >= 0.1) {
      unique.push(point);
    }
  }
  if (unique.length < 3) return unique;
  const compacted = [unique[0]!];
  for (let index = 1; index < unique.length - 1; index++) {
    const previous = compacted[compacted.length - 1]!;
    const current = unique[index]!;
    const next = unique[index + 1]!;
    const vertical = Math.abs(previous.x - current.x) < 0.1 && Math.abs(current.x - next.x) < 0.1;
    const horizontal = Math.abs(previous.y - current.y) < 0.1 && Math.abs(current.y - next.y) < 0.1;
    if (!vertical && !horizontal) compacted.push(current);
  }
  compacted.push(unique[unique.length - 1]!);
  return compacted;
}

/** Preserve the authored router's first-order shape while guaranteeing every preview segment is rectilinear. */
function orthogonalizeMovedPoints(
  original: Array<{ x: number; y: number }>,
  moved: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  const output: Array<{ x: number; y: number }> = [{ ...moved[0]! }];
  for (let index = 1; index < moved.length; index++) {
    const previous = output[output.length - 1]!;
    const next = moved[index]!;
    if (Math.abs(previous.x - next.x) < 0.1 || Math.abs(previous.y - next.y) < 0.1) {
      output.push({ ...next });
      continue;
    }
    const originalPrevious = original[Math.max(0, index - 1)]!;
    const originalNext = original[index] ?? originalPrevious;
    const wasHorizontal = Math.abs(originalPrevious.y - originalNext.y) < 0.1;
    output.push(wasHorizontal
      ? { x: next.x, y: previous.y }
      : { x: previous.x, y: next.y });
    output.push({ ...next });
  }
  return compactOrthogonalPoints(output);
}

function previewOrthogonalEdge(
  edge: LiveEdgePreview,
  dx: number,
  dy: number
): string | null {
  const original = parseOrthogonalPath(edge.basePath);
  if (!original) return null;
  const points = original.map((point) => ({
    x: point.x + dx * edge.allWeight,
    y: point.y + dy * edge.allWeight,
  }));
  const first = points[0]!;
  const last = points[points.length - 1]!;
  first.x += dx * edge.startWeight;
  first.y += dy * edge.startWeight;
  last.x += dx * edge.endWeight;
  last.y += dy * edge.endWeight;

  if (points.length === 2) {
    const horizontal = Math.abs(original[0]!.y - original[1]!.y) < 0.1;
    const vertical = Math.abs(original[0]!.x - original[1]!.x) < 0.1;
    if (Math.abs(first.y - last.y) < 0.1 || Math.abs(first.x - last.x) < 0.1) {
      return `M${fmt(first.x)} ${fmt(first.y)} L${fmt(last.x)} ${fmt(last.y)}`;
    }
    const bend = horizontal || !vertical
      ? { x: last.x, y: first.y }
      : { x: first.x, y: last.y };
    return `M${fmt(first.x)} ${fmt(first.y)} L${fmt(bend.x)} ${fmt(bend.y)} L${fmt(last.x)} ${fmt(last.y)}`;
  }

  const second = points[1]!;
  if (Math.abs(original[0]!.y - original[1]!.y) < 0.1) {
    second.y += dy * edge.startWeight;
  } else {
    second.x += dx * edge.startWeight;
  }
  const beforeLast = points[points.length - 2]!;
  const originalBeforeLast = original[original.length - 2]!;
  const originalLast = original[original.length - 1]!;
  if (Math.abs(originalBeforeLast.y - originalLast.y) < 0.1) {
    beforeLast.y += dy * edge.endWeight;
  } else {
    beforeLast.x += dx * edge.endWeight;
  }
  return orthogonalizeMovedPoints(original, points).map((point, index) =>
    `${index === 0 ? "M" : "L"}${fmt(point.x)} ${fmt(point.y)}`
  ).join(" ");
}

function previewQuadraticEdge(
  edge: LiveEdgePreview,
  dx: number,
  dy: number
): string | null {
  const number = "([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))";
  const match = new RegExp(`^\\s*M\\s*${number}[,\\s]+${number}\\s*Q\\s*${number}[,\\s]+${number}[,\\s]+${number}[,\\s]+${number}\\s*$`, "i").exec(edge.basePath);
  if (!match) return null;
  const start = { x: Number(match[1]), y: Number(match[2]) };
  const control = { x: Number(match[3]), y: Number(match[4]) };
  const end = { x: Number(match[5]), y: Number(match[6]) };
  const midpointWeight = (edge.startWeight + edge.endWeight) / 2;
  for (const point of [start, control, end]) {
    point.x += dx * edge.allWeight;
    point.y += dy * edge.allWeight;
  }
  start.x += dx * edge.startWeight;
  start.y += dy * edge.startWeight;
  end.x += dx * edge.endWeight;
  end.y += dy * edge.endWeight;
  control.x += dx * midpointWeight;
  control.y += dy * midpointWeight;
  return `M${fmt(start.x)} ${fmt(start.y)} Q${fmt(control.x)} ${fmt(control.y)} ${fmt(end.x)} ${fmt(end.y)}`;
}

function labelEditAnchor(label: SVGGraphicsElement): LabelEditAnchor {
  const style = window.getComputedStyle(label);
  const matrix = label.getScreenCTM();
  const screenScaleY = matrix ? Math.hypot(matrix.c, matrix.d) : 1;
  const fontSize = Number.parseFloat(style.fontSize) || 12;
  const rect = label.getBoundingClientRect();
  return {
    rect,
    measureRect: () => label.isConnected ? label.getBoundingClientRect() : rect,
    fontFamily: style.fontFamily,
    fontSize: fontSize * screenScaleY,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    letterSpacing: style.letterSpacing,
    color: style.fill && style.fill !== "none" ? style.fill : style.color,
  };
}

function collectLiveEdges(
  svg: SVGSVGElement,
  semanticId: string,
  bbox: NonNullable<SceneItem["bbox"]>
): LiveEdgePreview[] {
  const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
  const previews: LiveEdgePreview[] = [];
  const claimedPaths = new Set<SVGPathElement>();
  const groups = svg.querySelectorAll<SVGElement>(
    "g[data-from][data-to], path[data-from][data-to], g[data-sx-live-explicit='true'], path[data-sx-live-edge='true']"
  );

  for (const edgeGroup of groups) {
    const from = edgeGroup.getAttribute("data-from");
    const to = edgeGroup.getAttribute("data-to");
    const explicit = edgeGroup.getAttribute("data-sx-live-explicit") === "true";
    let startWeight = influenceWeight(edgeGroup.getAttribute("data-sx-live-start"), semanticId);
    let endWeight = influenceWeight(edgeGroup.getAttribute("data-sx-live-end"), semanticId);
    const allWeight = influenceWeight(edgeGroup.getAttribute("data-sx-live-all"), semanticId);
    if (explicit && startWeight === 0 && endWeight === 0 && allWeight === 0) continue;
    if (!explicit && from !== semanticId && to !== semanticId) continue;
    const path = edgeGroup instanceof SVGPathElement
      ? edgeGroup
      : edgeGroup.querySelector<SVGPathElement>("path[data-sx-live-edge], path.sx-fc-edge");
    const basePath = path?.getAttribute("d");
    if (!path || !basePath) continue;
    // A renderer can annotate both the semantic edge group and its child path.
    // Prefer the group metadata once; processing the child again would overwrite
    // an exact orthogonal preview with the generic sampled fallback.
    if (claimedPaths.has(path)) continue;
    claimedPaths.add(path);
    try {
      const length = path.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) continue;
      const sampleCount = Math.max(8, Math.min(24, Math.ceil(length / 18)));
      const points = Array.from({ length: sampleCount + 1 }, (_, index) => {
        const t = index / sampleCount;
        const point = path.getPointAtLength(length * t);
        return { x: point.x, y: point.y, t };
      });
      const first = points[0];
      const last = points[points.length - 1];
      if (!first || !last) continue;
      const firstDistance = Math.hypot(first.x - center.x, first.y - center.y);
      const lastDistance = Math.hypot(last.x - center.x, last.y - center.y);
      if (!explicit) {
        const isSelfLoop = from === semanticId && to === semanticId;
        startWeight = isSelfLoop || firstDistance <= lastDistance ? 1 : 0;
        endWeight = isSelfLoop || lastDistance < firstDistance ? 1 : 0;
      }
      const labelGroup = edgeGroup instanceof SVGGElement
        ? edgeGroup.querySelector<SVGGElement>(".sx-fc-edge-label-g")
        : null;
      previews.push({
        path,
        basePath,
        points,
        mode: edgeGroup.getAttribute("data-sx-live-mode") === "orthogonal"
          ? "orthogonal"
          : edgeGroup.getAttribute("data-sx-live-mode") === "quadratic"
            ? "quadratic"
            : "sampled",
        startWeight,
        endWeight,
        allWeight,
        labelGroup,
        baseLabelTransform: labelGroup?.getAttribute("transform") ?? null,
        midpointElements: Array.from(
          edgeGroup.querySelectorAll<SVGGraphicsElement>("[data-sx-live-midpoint]")
        ).map((element) => ({
          element,
          baseTransform: element.getAttribute("transform"),
        })),
      });
    } catch {
      // An empty or browser-unsupported SVG path should not block dragging.
    }
  }
  return previews;
}

function previewLiveEdges(edges: LiveEdgePreview[], dx: number, dy: number): void {
  for (const edge of edges) {
    const exactPath = edge.mode === "orthogonal"
      ? previewOrthogonalEdge(edge, dx, dy)
      : edge.mode === "quadratic"
        ? previewQuadraticEdge(edge, dx, dy)
        : null;
    const path = exactPath ?? edge.points.map((point, index) => {
      const weight = edge.allWeight
        + edge.startWeight * (1 - point.t)
        + edge.endWeight * point.t;
      const command = index === 0 ? "M" : "L";
      return `${command}${fmt(point.x + dx * weight)} ${fmt(point.y + dy * weight)}`;
    }).join(" ");
    edge.path.setAttribute("d", path);
    const midpointWeight = edge.allWeight + (edge.startWeight + edge.endWeight) / 2;
    if (edge.labelGroup) {
      const delta = `translate(${fmt(dx * midpointWeight)} ${fmt(dy * midpointWeight)})`;
      edge.labelGroup.setAttribute(
        "transform",
        edge.baseLabelTransform ? `${delta} ${edge.baseLabelTransform}` : delta
      );
    }
    for (const midpoint of edge.midpointElements) {
      const delta = `translate(${fmt(dx * midpointWeight)} ${fmt(dy * midpointWeight)})`;
      midpoint.element.setAttribute(
        "transform",
        midpoint.baseTransform ? `${delta} ${midpoint.baseTransform}` : delta
      );
    }
  }
}

function restoreDragVisual(state: DragState): void {
  for (const linked of state.linkedElements) {
    if (linked.baseTransform) linked.element.setAttribute("transform", linked.baseTransform);
    else linked.element.removeAttribute("transform");
  }
  for (const edge of state.liveEdges) {
    edge.path.setAttribute("d", edge.basePath);
    if (edge.labelGroup) {
      if (edge.baseLabelTransform === null) edge.labelGroup.removeAttribute("transform");
      else edge.labelGroup.setAttribute("transform", edge.baseLabelTransform);
    }
    for (const midpoint of edge.midpointElements) {
      if (midpoint.baseTransform === null) midpoint.element.removeAttribute("transform");
      else midpoint.element.setAttribute("transform", midpoint.baseTransform);
    }
  }
}

/**
 * Attach target detection and editing gestures to one rendered SVG.
 * The host owns form UI, rerendering, and styling; this layer owns gestures,
 * CTM coordinate conversion, stale protection, and deterministic DSL edits.
 */
export function attachInteraction(
  svg: SVGSVGElement,
  options: InteractionOptions
): () => void {
  let selected: SVGElement | null = null;
  let drag: DragState | null = null;
  let suppressClick = false;
  let cancelActiveLabelEdit: (() => void) | null = null;

  const currentScene = (): InteractionScene | null => {
    const scene = options.getScene();
    return scene.rev === sourceRevision(options.getSource()) ? scene : null;
  };

  const select = (hit: { item: SceneItem; element: SVGElement } | null): void => {
    if (selected !== hit?.element) selected?.classList.remove("sx-interactive-selected");
    selected = hit?.element ?? null;
    selected?.classList.add("sx-interactive-selected");
    options.onSelect?.(hit?.item ?? null);
  };

  const onClick = (event: MouseEvent): void => {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }
    const scene = currentScene();
    if (!scene) return;
    select(sceneItemFor(eventElement(event.target), scene.items));
  };

  const onDoubleClick = (event: MouseEvent): void => {
    const target = eventElement(event.target);
    const scene = currentScene();
    if (!scene) return;
    const directLabel = target?.closest<SVGGraphicsElement>("[data-sx-role='label']");
    const keyed = target?.closest<SVGElement>("[data-sx-owner], [data-sx-key]");
    // SVG hit testing can report the containing <g> even when the visible
    // glyph was double-clicked. Resolve that group's declared primary label
    // so the gesture remains reliable across browsers and shape geometry.
    const label = directLabel ?? keyed?.querySelector<SVGGraphicsElement>("[data-sx-role='label']");
    if (!label) return;
    // Resolve the edit target from the original pointer target first. Some SVG
    // engines render their label as a sibling inside the keyed group; asking
    // the label to rediscover its owner was unreliable for shape double-clicks.
    const hit = sceneItemFor(target, scene.items, { preferOwner: true })
      ?? sceneItemFor(label, scene.items, { preferOwner: true });
    if (!hit?.item.editable.label || !options.onRequestLabelEdit) return;
    event.preventDefault();
    event.stopPropagation();
    select(hit);
    const sourceAtRequest = options.getSource();
    const revisionAtRequest = scene.rev;
    cancelActiveLabelEdit?.();
    label.classList.add("sx-label-editing");
    let settled = false;
    const cancel = (): void => {
      if (settled) return;
      settled = true;
      label.classList.remove("sx-label-editing");
      cancelActiveLabelEdit = null;
    };
    cancelActiveLabelEdit = cancel;
    options.onRequestLabelEdit(hit.item, labelEditAnchor(label), (text) => {
      cancel();
      if (sourceRevision(options.getSource()) !== revisionAtRequest) return;
      const edited = setLabel(sourceAtRequest, hit.item, text);
      if (edited.diagnostics.length === 0 && edited.source !== sourceAtRequest) {
        options.onSourceChange(edited.source, "label");
      }
    }, cancel);
  };

  const finishDrag = (commit: boolean): void => {
    if (!drag) return;
    const state = drag;
    drag = null;
    const endTransform = state.element.getAttribute("data-sx-drag-delta");
    state.element.removeAttribute("data-sx-drag-delta");
    state.element.removeAttribute("data-sx-dragging");
    try {
      state.element.releasePointerCapture(state.pointerId);
    } catch {
      // Pointer capture may already be gone after pointercancel/detach.
    }
    if (!commit || !state.moved || !state.item.bbox) {
      restoreDragVisual(state);
      return;
    }
    const scene = currentScene();
    if (!scene || !endTransform) {
      restoreDragVisual(state);
      return;
    }
    const [dxText, dyText] = endTransform.split(",");
    const dx = Number(dxText);
    const dy = Number(dyText);
    const currentSource = options.getSource();
    const edited = setPosition(currentSource, state.item, {
      x: state.item.bbox.x + dx,
      y: state.item.bbox.y + dy,
    });
    if (edited.diagnostics.length === 0 && edited.source !== currentSource) {
      suppressClick = true;
      options.onSourceChange(edited.source, "position");
      return;
    }
    restoreDragVisual(state);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    const scene = currentScene();
    if (!scene) return;
    const hit = sceneItemFor(eventElement(event.target), scene.items, { preferOwner: true });
    if (!hit || hit.item.editable.position === "none" || !hit.item.bbox) return;
    const start = pointInSvg(svg, event.clientX, event.clientY);
    if (!start) return;
    drag = {
      pointerId: event.pointerId,
      item: hit.item,
      element: hit.element,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startSvgX: start.x,
      startSvgY: start.y,
      baseTransform: hit.element.getAttribute("transform") ?? "",
      linkedElements: (() => {
        const linked = Array.from(svg.querySelectorAll<SVGElement>("[data-sx-owner]"))
          .filter((element) => element.getAttribute("data-sx-owner") === hit.item.key);
        if (!linked.includes(hit.element)) linked.push(hit.element);
        return linked.map((element) => ({
          element,
          baseTransform: element.getAttribute("transform") ?? "",
        }));
      })(),
      liveEdges: hit.item.semanticId
        ? collectLiveEdges(svg, hit.item.semanticId, hit.item.bbox)
        : [],
      moved: false,
    };
    hit.element.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const clientDistance = Math.hypot(
      event.clientX - drag.startClientX,
      event.clientY - drag.startClientY
    );
    if (!drag.moved && clientDistance < DRAG_THRESHOLD) return;
    const point = pointInSvg(svg, event.clientX, event.clientY);
    if (!point) return;
    drag.moved = true;
    let dx = point.x - drag.startSvgX;
    let dy = point.y - drag.startSvgY;
    if (drag.item.editable.position === "move-x") dy = 0;
    if (drag.item.editable.position === "move-y") dx = 0;
    drag.element.setAttribute("data-sx-dragging", "true");
    drag.element.setAttribute("data-sx-drag-delta", `${dx},${dy}`);
    const delta = `translate(${fmt(dx)} ${fmt(dy)})`;
    for (const linked of drag.linkedElements) {
      linked.element.setAttribute(
        "transform",
        linked.baseTransform ? `${delta} ${linked.baseTransform}` : delta
      );
    }
    previewLiveEdges(drag.liveEdges, dx, dy);
    event.preventDefault();
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    finishDrag(true);
  };

  const onPointerCancel = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    finishDrag(false);
  };

  svg.addEventListener("click", onClick);
  svg.addEventListener("dblclick", onDoubleClick);
  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointercancel", onPointerCancel);

  return () => {
    finishDrag(false);
    cancelActiveLabelEdit?.();
    selected?.classList.remove("sx-interactive-selected");
    svg.removeEventListener("click", onClick);
    svg.removeEventListener("dblclick", onDoubleClick);
    svg.removeEventListener("pointerdown", onPointerDown);
    svg.removeEventListener("pointermove", onPointerMove);
    svg.removeEventListener("pointerup", onPointerUp);
    svg.removeEventListener("pointercancel", onPointerCancel);
  };
}
