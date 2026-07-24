/** Framework-independent viewport gestures and commands for rendered diagrams. */

export interface ViewportState {
  /** Current zoom ratio. `1` is the rendered SVG's original CSS size. */
  scale: number;
  /** CSS-pixel translation applied to the host with transform-origin `0 0`. */
  x: number;
  y: number;
}

export interface ViewportOptions {
  minScale?: number;
  maxScale?: number;
  /** Fit on attach. React integrations also fit after the diagram type changes. */
  initialFit?: "contain" | "none";
  /** Require Ctrl/Command for wheel zoom. Trackpad pinch reports Ctrl automatically. */
  wheelRequiresModifier?: boolean;
  /** Pan by dragging unclaimed canvas space. */
  pan?: boolean;
  /** Zoom and pan with two touch pointers. */
  pinch?: boolean;
  /** Zoom on an unclaimed double click. Disabled by default to protect label editing. */
  doubleClickZoom?: boolean;
}

export interface ViewportController {
  zoomIn(step?: number): void;
  zoomOut(step?: number): void;
  /** `origin` is expressed in CSS pixels from the viewport frame's top-left corner. */
  zoomTo(scale: number, origin?: { x: number; y: number }): void;
  panBy(dx: number, dy: number): void;
  fit(): void;
  reset(): void;
  getState(): ViewportState;
  setState(next: Partial<ViewportState>): void;
  /** Remove every listener/observer and restore the frame and host inline styles. */
  detach(): void;
}

interface ViewportMetrics {
  frameWidth: number;
  frameHeight: number;
  hostX: number;
  hostY: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
}

interface ActivePointer {
  x: number;
  y: number;
  claimedByInteraction: boolean;
}

interface PanGesture {
  pointerId: number;
  startX: number;
  startY: number;
  state: ViewportState;
  moved: boolean;
}

interface PinchGesture {
  pointerIds: [number, number];
  midpoint: { x: number; y: number };
  distance: number;
  state: ViewportState;
}

interface NormalizedViewportOptions {
  minScale: number;
  maxScale: number;
  initialFit: "contain" | "none";
  wheelRequiresModifier: boolean;
  pan: boolean;
  pinch: boolean;
  doubleClickZoom: boolean;
}

const DEFAULT_MIN_SCALE = 0.1;
const DEFAULT_MAX_SCALE = 10;
const DEFAULT_ZOOM_STEP = 0.2;
const PAN_THRESHOLD = 3;

function finitePositive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function normalizeOptions(options: ViewportOptions): NormalizedViewportOptions {
  const minScale = finitePositive(options.minScale, DEFAULT_MIN_SCALE);
  const maxScale = Math.max(
    minScale,
    finitePositive(options.maxScale, DEFAULT_MAX_SCALE),
  );
  return {
    minScale,
    maxScale,
    initialFit: options.initialFit ?? "contain",
    wheelRequiresModifier: options.wheelRequiresModifier ?? true,
    pan: options.pan ?? true,
    pinch: options.pinch ?? true,
    doubleClickZoom: options.doubleClickZoom ?? false,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sameState(a: ViewportState, b: ViewportState): boolean {
  return a.scale === b.scale && a.x === b.x && a.y === b.y;
}

function localPoint(
  frame: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = frame.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function svgFallbackSize(svg: SVGSVGElement | null): { width: number; height: number } {
  if (!svg) return { width: 0, height: 0 };
  const viewBox = svg.viewBox?.baseVal;
  const widthAttribute = Number.parseFloat(svg.getAttribute("width") ?? "");
  const heightAttribute = Number.parseFloat(svg.getAttribute("height") ?? "");
  return {
    width: viewBox?.width || (Number.isFinite(widthAttribute) ? widthAttribute : 0),
    height: viewBox?.height || (Number.isFinite(heightAttribute) ? heightAttribute : 0),
  };
}

function measureViewport(
  frame: HTMLElement,
  host: HTMLElement,
): ViewportMetrics | null {
  const transformed = host.style.transform;
  host.style.transform = "none";
  const frameRect = frame.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const svg = host.querySelector<SVGSVGElement>("svg");
  const contentRect = svg?.getBoundingClientRect() ?? hostRect;
  const fallback = svgFallbackSize(svg);
  host.style.transform = transformed;

  const frameWidth = frame.clientWidth || frameRect.width;
  const frameHeight = frame.clientHeight || frameRect.height;
  const contentWidth = contentRect.width || fallback.width || host.scrollWidth || hostRect.width;
  const contentHeight = contentRect.height || fallback.height || host.scrollHeight || hostRect.height;
  if (
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return null;
  }
  return {
    frameWidth,
    frameHeight,
    hostX: hostRect.left - frameRect.left,
    hostY: hostRect.top - frameRect.top,
    contentX: contentRect.left - hostRect.left,
    contentY: contentRect.top - hostRect.top,
    contentWidth,
    contentHeight,
  };
}

function clampTranslation(
  state: ViewportState,
  metrics: ViewportMetrics | null,
): ViewportState {
  if (!metrics) return state;
  const scaledWidth = metrics.contentWidth * state.scale;
  const scaledHeight = metrics.contentHeight * state.scale;
  const currentLeft = metrics.hostX + state.x + metrics.contentX * state.scale;
  const currentTop = metrics.hostY + state.y + metrics.contentY * state.scale;
  const left = scaledWidth <= metrics.frameWidth
    ? (metrics.frameWidth - scaledWidth) / 2
    : clamp(currentLeft, metrics.frameWidth - scaledWidth, 0);
  const top = scaledHeight <= metrics.frameHeight
    ? (metrics.frameHeight - scaledHeight) / 2
    : clamp(currentTop, metrics.frameHeight - scaledHeight, 0);
  return {
    scale: state.scale,
    x: left - metrics.hostX - metrics.contentX * state.scale,
    y: top - metrics.hostY - metrics.contentY * state.scale,
  };
}

function contentCenteredState(
  scale: number,
  metrics: ViewportMetrics,
): ViewportState {
  return {
    scale,
    x:
      (metrics.frameWidth - metrics.contentWidth * scale) / 2 -
      metrics.hostX -
      metrics.contentX * scale,
    y:
      (metrics.frameHeight - metrics.contentHeight * scale) / 2 -
      metrics.hostY -
      metrics.contentY * scale,
  };
}

function cancelClaimedInteractionDrag(host: HTMLElement, pointerId: number): void {
  const svg = host.querySelector<SVGSVGElement>("svg");
  if (!svg) return;
  const view = svg.ownerDocument?.defaultView;
  const PointerEventConstructor = view?.PointerEvent;
  let event: Event;
  if (PointerEventConstructor) {
    event = new PointerEventConstructor("pointercancel", { pointerId });
  } else {
    event = new Event("pointercancel");
    Object.defineProperty(event, "pointerId", { value: pointerId });
  }
  // Dispatch directly on the SVG. The interaction adapter owns its semantic
  // cancel path there; keeping this event non-bubbling preserves our two-touch
  // bookkeeping while returning the in-progress node drag to its source state.
  svg.dispatchEvent(event);
}

/**
 * Attach a pan/zoom viewport to a frame and an inner transform host.
 *
 * The CSS transform intentionally lives outside the SVG. `getScreenCTM()`
 * therefore includes it, keeping diagram-editing coordinates correct.
 */
export function attachViewport(
  frame: HTMLElement,
  host: HTMLElement,
  options: ViewportOptions = {},
  onChange?: (state: ViewportState) => void,
): ViewportController {
  const settings = normalizeOptions(options);
  const previousFramePosition = frame.style.position;
  const previousFrameOverflow = frame.style.overflow;
  const previousFrameTouchAction = frame.style.touchAction;
  const previousHostTransform = host.style.transform;
  const previousHostTransformOrigin = host.style.transformOrigin;
  let state: ViewportState = { scale: 1, x: 0, y: 0 };
  let metrics: ViewportMetrics | null = null;
  let detached = false;
  let panGesture: PanGesture | null = null;
  let pinchGesture: PinchGesture | null = null;
  let suppressPanClick = false;
  const activePointers = new Map<number, ActivePointer>();

  const computedFramePosition =
    frame.ownerDocument?.defaultView?.getComputedStyle?.(frame).position;
  if (
    computedFramePosition === "static" ||
    (computedFramePosition === undefined && frame.style.position === "")
  ) {
    frame.style.position = "relative";
  }
  frame.style.overflow = "hidden";
  frame.style.touchAction = "none";
  host.style.transformOrigin = "0 0";

  const refreshMetrics = (): ViewportMetrics | null => {
    metrics = measureViewport(frame, host);
    return metrics;
  };

  const renderState = (
    next: ViewportState,
    { clampPosition = true, notify = true } = {},
  ): void => {
    if (detached) return;
    const boundedScale = clamp(next.scale, settings.minScale, settings.maxScale);
    const bounded = clampPosition
      ? clampTranslation({ ...next, scale: boundedScale }, metrics)
      : { ...next, scale: boundedScale };
    const changed = !sameState(state, bounded);
    state = bounded;
    host.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    if (notify && changed) onChange?.({ ...state });
  };

  const frameCenter = (): { x: number; y: number } => {
    const rect = frame.getBoundingClientRect();
    return {
      x: (frame.clientWidth || rect.width) / 2,
      y: (frame.clientHeight || rect.height) / 2,
    };
  };

  const zoomTo = (
    nextScale: number,
    origin = frameCenter(),
  ): void => {
    if (detached || !Number.isFinite(nextScale)) return;
    const scale = clamp(nextScale, settings.minScale, settings.maxScale);
    const ratio = scale / state.scale;
    renderState({
      scale,
      x: origin.x - (origin.x - state.x) * ratio,
      y: origin.y - (origin.y - state.y) * ratio,
    });
  };

  const fit = (): void => {
    const measured = refreshMetrics();
    if (!measured) return;
    const scale = clamp(
      Math.min(
        measured.frameWidth / measured.contentWidth,
        measured.frameHeight / measured.contentHeight,
      ),
      settings.minScale,
      settings.maxScale,
    );
    renderState(contentCenteredState(scale, measured), { clampPosition: false });
  };

  const reset = (): void => {
    const measured = refreshMetrics();
    if (!measured) {
      renderState({ scale: 1, x: 0, y: 0 }, { clampPosition: false });
      return;
    }
    renderState(contentCenteredState(1, measured), { clampPosition: false });
  };

  const beginPinch = (): void => {
    if (!settings.pinch || activePointers.size < 2) return;
    const entries = Array.from(activePointers.entries()).slice(0, 2);
    const first = entries[0];
    const second = entries[1];
    if (!first || !second) return;
    for (const [pointerId, pointer] of entries) {
      if (pointer.claimedByInteraction) cancelClaimedInteractionDrag(host, pointerId);
      try {
        frame.setPointerCapture(pointerId);
      } catch {
        // Synthetic pointers and already-cancelled native pointers cannot be captured.
      }
    }
    panGesture = null;
    const midpoint = {
      x: (first[1].x + second[1].x) / 2,
      y: (first[1].y + second[1].y) / 2,
    };
    pinchGesture = {
      pointerIds: [first[0], second[0]],
      midpoint,
      distance: Math.max(
        1,
        Math.hypot(first[1].x - second[1].x, first[1].y - second[1].y),
      ),
      state: { ...state },
    };
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const point = localPoint(frame, event.clientX, event.clientY);
    if (event.pointerType === "touch") {
      activePointers.set(event.pointerId, {
        ...point,
        claimedByInteraction: event.defaultPrevented,
      });
      if (activePointers.size >= 2) {
        beginPinch();
        event.preventDefault();
        return;
      }
    }
    if (!settings.pan || event.defaultPrevented) return;
    panGesture = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      state: { ...state },
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent): void => {
    const point = localPoint(frame, event.clientX, event.clientY);
    const active = activePointers.get(event.pointerId);
    if (active) {
      active.x = point.x;
      active.y = point.y;
    }
    if (pinchGesture) {
      const first = activePointers.get(pinchGesture.pointerIds[0]);
      const second = activePointers.get(pinchGesture.pointerIds[1]);
      if (!first || !second) return;
      const midpoint = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const distance = Math.max(1, Math.hypot(first.x - second.x, first.y - second.y));
      const scale = clamp(
        pinchGesture.state.scale * (distance / pinchGesture.distance),
        settings.minScale,
        settings.maxScale,
      );
      const ratio = scale / pinchGesture.state.scale;
      renderState({
        scale,
        x:
          midpoint.x -
          (pinchGesture.midpoint.x - pinchGesture.state.x) * ratio,
        y:
          midpoint.y -
          (pinchGesture.midpoint.y - pinchGesture.state.y) * ratio,
      });
      event.preventDefault();
      return;
    }
    if (!panGesture || panGesture.pointerId !== event.pointerId) return;
    const dx = point.x - panGesture.startX;
    const dy = point.y - panGesture.startY;
    if (!panGesture.moved && Math.hypot(dx, dy) < PAN_THRESHOLD) return;
    if (!panGesture.moved) {
      panGesture.moved = true;
      suppressPanClick = true;
      try {
        frame.setPointerCapture(event.pointerId);
      } catch {
        // Tests and detached/synthetic events may not have native pointer capture.
      }
    }
    renderState({
      ...panGesture.state,
      x: panGesture.state.x + dx,
      y: panGesture.state.y + dy,
    });
    event.preventDefault();
  };

  const finishPointer = (event: PointerEvent): void => {
    activePointers.delete(event.pointerId);
    if (pinchGesture?.pointerIds.includes(event.pointerId)) {
      pinchGesture = null;
      panGesture = null;
    } else if (panGesture?.pointerId === event.pointerId) {
      panGesture = null;
    }
    try {
      frame.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }
  };

  const onWheel = (event: WheelEvent): void => {
    if (
      settings.wheelRequiresModifier &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      return;
    }
    const point = localPoint(frame, event.clientX, event.clientY);
    const unit = event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? frame.clientHeight || 800
        : 1;
    zoomTo(state.scale * Math.exp(-event.deltaY * unit * 0.002), point);
    event.preventDefault();
  };

  const onDoubleClick = (event: MouseEvent): void => {
    if (!settings.doubleClickZoom || event.defaultPrevented) return;
    zoomTo(
      state.scale + DEFAULT_ZOOM_STEP,
      localPoint(frame, event.clientX, event.clientY),
    );
    event.preventDefault();
  };

  const onClickCapture = (event: MouseEvent): void => {
    if (!suppressPanClick) return;
    suppressPanClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  frame.addEventListener("pointerdown", onPointerDown);
  frame.addEventListener("pointermove", onPointerMove);
  frame.addEventListener("pointerup", finishPointer);
  frame.addEventListener("pointercancel", finishPointer);
  frame.addEventListener("wheel", onWheel, { passive: false });
  frame.addEventListener("dblclick", onDoubleClick);
  frame.addEventListener("click", onClickCapture, true);

  const ResizeObserverConstructor = frame.ownerDocument?.defaultView?.ResizeObserver
    ?? (typeof ResizeObserver === "undefined" ? undefined : ResizeObserver);
  const resizeObserver = ResizeObserverConstructor
    ? new ResizeObserverConstructor(() => {
        refreshMetrics();
        renderState(state);
      })
    : null;
  resizeObserver?.observe(frame);

  refreshMetrics();
  if (settings.initialFit === "contain") fit();
  else renderState(state, { clampPosition: false, notify: false });

  const controller: ViewportController = {
    zoomIn(step = DEFAULT_ZOOM_STEP) {
      const amount = finitePositive(step, DEFAULT_ZOOM_STEP);
      zoomTo(state.scale + amount);
    },
    zoomOut(step = DEFAULT_ZOOM_STEP) {
      const amount = finitePositive(step, DEFAULT_ZOOM_STEP);
      zoomTo(state.scale - amount);
    },
    zoomTo,
    panBy(dx, dy) {
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      renderState({ ...state, x: state.x + dx, y: state.y + dy });
    },
    fit,
    reset,
    getState() {
      return { ...state };
    },
    setState(next) {
      refreshMetrics();
      renderState({
        scale: next.scale ?? state.scale,
        x: next.x ?? state.x,
        y: next.y ?? state.y,
      });
    },
    detach() {
      if (detached) return;
      detached = true;
      resizeObserver?.disconnect();
      activePointers.clear();
      panGesture = null;
      pinchGesture = null;
      frame.removeEventListener("pointerdown", onPointerDown);
      frame.removeEventListener("pointermove", onPointerMove);
      frame.removeEventListener("pointerup", finishPointer);
      frame.removeEventListener("pointercancel", finishPointer);
      frame.removeEventListener("wheel", onWheel);
      frame.removeEventListener("dblclick", onDoubleClick);
      frame.removeEventListener("click", onClickCapture, true);
      frame.style.position = previousFramePosition;
      frame.style.overflow = previousFrameOverflow;
      frame.style.touchAction = previousFrameTouchAction;
      host.style.transform = previousHostTransform;
      host.style.transformOrigin = previousHostTransformOrigin;
    },
  };
  return controller;
}
