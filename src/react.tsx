"use client";

/** React renderers for read-only and controlled interactive Schematex diagrams. */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  renderResult,
  type SchematexConfig,
} from "./core/api";
import type { SchematexRenderResult } from "./core/diagnostics";
import type { SceneItem } from "./core/types";
import {
  attachInteraction,
  attachViewport,
  sourceRevision,
  type LabelEditAnchor,
  type ViewportController,
  type ViewportOptions,
  type ViewportState,
} from "./interactive";

export interface SchematexDiagramProps {
  /** DSL text to render. */
  dsl: string;
  /** Diagram type override; auto-detected when omitted. */
  type?: SchematexConfig["type"];
  theme?: string;
  fontFamily?: string;
  padding?: number;
  className?: string;
  style?: CSSProperties;
  /** Opt-in host-layer pan, zoom, and fit-to-view. */
  viewport?: boolean | ViewportOptions;
  onViewportChange?: (state: ViewportState) => void;
  viewportRef?: Ref<ViewportController>;
  /** Called after a strict parser/layout failure; the diagnostic SVG still renders. */
  onError?: (error: Error) => void;
}

function renderError(result: SchematexRenderResult): Error | null {
  return result.ok
    ? null
    : new Error(result.diagnostics[0]?.message ?? "Schematex render failed");
}

function setReactRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref) (ref as { current: T | null }).current = value;
}

function useDiagramViewport({
  viewport,
  onViewportChange,
  viewportRef,
  frameRef,
  hostRef,
  structuralKey,
  contentKey,
  onInternalChange,
}: {
  viewport: boolean | ViewportOptions | undefined;
  onViewportChange: ((state: ViewportState) => void) | undefined;
  viewportRef: Ref<ViewportController> | undefined;
  frameRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  structuralKey: string;
  contentKey: string;
  onInternalChange?: (state: ViewportState) => void;
}): boolean {
  const enabled = viewport !== undefined && viewport !== false;
  const options = typeof viewport === "object" ? viewport : {};
  const {
    minScale,
    maxScale,
    initialFit,
    wheelRequiresModifier,
    pan,
    pinch,
    doubleClickZoom,
  } = options;
  const controllerRef = useRef<ViewportController | null>(null);
  const changeRef = useRef(onViewportChange);
  const internalChangeRef = useRef(onInternalChange);
  const fittedStructuralKeyRef = useRef(structuralKey);
  changeRef.current = onViewportChange;
  internalChangeRef.current = onInternalChange;

  useEffect(() => {
    if (!enabled || !frameRef.current || !hostRef.current) {
      setReactRef(viewportRef, null);
      return;
    }
    const controller = attachViewport(
      frameRef.current,
      hostRef.current,
      {
        minScale,
        maxScale,
        initialFit,
        wheelRequiresModifier,
        pan,
        pinch,
        doubleClickZoom,
      },
      (state) => {
        internalChangeRef.current?.(state);
        changeRef.current?.(state);
      },
    );
    controllerRef.current = controller;
    fittedStructuralKeyRef.current = structuralKey;
    setReactRef(viewportRef, controller);
    return () => {
      controller.detach();
      controllerRef.current = null;
      setReactRef(viewportRef, null);
    };
  }, [
    doubleClickZoom,
    enabled,
    frameRef,
    hostRef,
    initialFit,
    maxScale,
    minScale,
    pan,
    pinch,
    structuralKey,
    viewportRef,
    wheelRequiresModifier,
  ]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (fittedStructuralKeyRef.current !== structuralKey) {
      fittedStructuralKeyRef.current = structuralKey;
      if ((initialFit ?? "contain") === "contain") controller.fit();
      return;
    }
    // Re-measure a replacement SVG while preserving the user's current state.
    controller.setState({});
  }, [contentKey, initialFit, structuralKey]);

  return enabled;
}

/** Small read-only renderer; use InteractiveSchematexDiagram for canvas editing. */
export function SchematexDiagram({
  dsl,
  type,
  theme,
  fontFamily,
  padding,
  className,
  style,
  viewport,
  onViewportChange,
  viewportRef,
  onError,
}: SchematexDiagramProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const result = useMemo(
    () => renderResult(dsl, { type, theme, fontFamily, padding }),
    [dsl, type, theme, fontFamily, padding],
  );
  const viewportEnabled = useDiagramViewport({
    viewport,
    onViewportChange,
    viewportRef,
    frameRef,
    hostRef,
    structuralKey: result.type ?? type ?? "",
    contentKey: result.svg,
  });

  useEffect(() => {
    const error = renderError(result);
    if (error) onError?.(error);
  }, [onError, result]);

  if (viewportEnabled) {
    return (
      <div
        ref={frameRef}
        className={className}
        style={style}
        data-schematex-viewport="true"
      >
        <div
          ref={hostRef}
          data-schematex-viewport-host="true"
          dangerouslySetInnerHTML={{ __html: result.svg }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
  );
}

export interface InteractiveEditDetail {
  reason: "label" | "position";
  item: SceneItem | null;
}

export interface InteractiveSchematexDiagramProps {
  /** Controlled DSL source. Every canvas edit is returned through onChange. */
  value: string;
  onChange: (value: string, detail: InteractiveEditDetail) => void;
  type?: SchematexConfig["type"];
  theme?: string;
  fontFamily?: string;
  padding?: number;
  readOnly?: boolean;
  /** Delay expensive re-renders while a source editor is typing. Direct canvas edits remain guarded against stale scenes. */
  debounceMs?: number;
  className?: string;
  /** Class applied to the inner canvas host div that contains the generated SVG. */
  canvasClassName?: string;
  style?: CSSProperties;
  /** Opt-in host-layer pan, zoom, and fit-to-view. */
  viewport?: boolean | ViewportOptions;
  onViewportChange?: (state: ViewportState) => void;
  viewportRef?: Ref<ViewportController>;
  ariaLabel?: string;
  labelEditorClassName?: string;
  labelEditorStyle?: CSSProperties;
  /** Controlled scene key selected by an external source editor. */
  selectedKey?: string | null;
  onSelect?: (item: SceneItem | null) => void;
  /** Transient drag source for live code previews; `null` discards a cancelled preview. */
  onPreviewChange?: (value: string | null, detail: InteractiveEditDetail) => void;
  onRender?: (result: SchematexRenderResult) => void;
  onError?: (error: Error) => void;
}

interface LabelEditorState {
  item: SceneItem;
  anchor: LabelEditAnchor;
  draft: string;
  draftWidth: number;
  commit: (text: string) => void;
  cancel: () => void;
}

function measureDraftWidth(anchor: LabelEditAnchor, draft: string): number {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return Math.max(anchor.rect.width, draft.length * anchor.fontSize * 0.62);
  context.font = `${anchor.fontStyle} ${anchor.fontWeight} ${anchor.fontSize}px ${anchor.fontFamily}`;
  let width = context.measureText(draft || " ").width;
  const letterSpacing = Number.parseFloat(anchor.letterSpacing);
  if (Number.isFinite(letterSpacing) && draft.length > 1) {
    width += letterSpacing * (draft.length - 1);
  }
  return width;
}

function defaultLabelEditorStyle(state: LabelEditorState): CSSProperties {
  const { anchor, draftWidth } = state;
  const width = Math.max(
    28,
    Math.min(window.innerWidth - 16, Math.max(anchor.rect.width, draftWidth) + 12),
  );
  const height = Math.max(22, anchor.rect.height + 6);
  return {
    position: "fixed",
    zIndex: 1000,
    boxSizing: "border-box",
    left: Math.max(
      8,
      Math.min(anchor.rect.left + anchor.rect.width / 2 - width / 2, window.innerWidth - width - 8),
    ),
    top: Math.max(
      8,
      Math.min(anchor.rect.top + anchor.rect.height / 2 - height / 2, window.innerHeight - height - 8),
    ),
    width,
    height,
    margin: 0,
    padding: "0 5px",
    border: "1px solid var(--schematex-editor-accent, #2457f5)",
    borderRadius: 4,
    outline: "2px solid color-mix(in srgb, var(--schematex-editor-accent, #2457f5) 18%, transparent)",
    outlineOffset: 0,
    background: "var(--schematex-editor-background, #ffffff)",
    color: anchor.color,
    fontFamily: anchor.fontFamily,
    fontSize: anchor.fontSize,
    fontWeight: anchor.fontWeight,
    fontStyle: anchor.fontStyle,
    letterSpacing: anchor.letterSpacing,
    lineHeight: 1,
    textAlign: "center",
    appearance: "none",
  };
}

const INTERACTIVE_STYLES = `
.schematex-interactive-editor .sx-interactive-movable {
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.schematex-interactive-editor [data-sx-interactive-position='move-x'] { cursor: ew-resize; }
.schematex-interactive-editor [data-sx-interactive-position='move-y'] { cursor: ns-resize; }
.schematex-interactive-editor [data-sx-role='label'] { cursor: text; }
.schematex-interactive-editor [data-sx-key],
.schematex-interactive-editor [data-sx-owner] {
  transition: filter .12s ease, opacity .12s ease;
}
.schematex-interactive-editor .sx-interactive-selected:not([data-sx-role='label']) {
  filter:
    drop-shadow(0 0 1px var(--schematex-editor-accent, #2457f5))
    drop-shadow(0 0 1px var(--schematex-editor-accent, #2457f5));
}
.schematex-interactive-editor .sx-interactive-selected[data-sx-role='label'] {
  fill: var(--schematex-editor-accent, #2457f5) !important;
  font-weight: 600;
}
.schematex-interactive-editor [data-sx-dragging='true'] { cursor: grabbing; opacity: .82; }
.schematex-interactive-editor .sx-label-editing { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .schematex-interactive-editor * {
    scroll-behavior: auto !important;
    transition-duration: 0s !important;
  }
}
`;

/**
 * Controlled, framework-light diagram editor.
 *
 * It owns SVG gestures and the WYSIWYG label input while the caller owns DSL
 * state, persistence, undo, collaboration, and any source-code editor.
 */
export function InteractiveSchematexDiagram({
  value,
  onChange,
  type,
  theme,
  fontFamily,
  padding,
  readOnly = false,
  debounceMs = 0,
  className,
  canvasClassName,
  style,
  viewport,
  onViewportChange,
  viewportRef,
  ariaLabel = "Editable Schematex diagram",
  labelEditorClassName = "sx-label-editor",
  labelEditorStyle,
  selectedKey,
  onSelect,
  onPreviewChange,
  onRender,
  onError,
}: InteractiveSchematexDiagramProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(value);
  const selectedRef = useRef<SceneItem | null>(null);
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  const onPreviewChangeRef = useRef(onPreviewChange);
  const cancelLabelEditRef = useRef<(() => void) | null>(null);
  const syncLabelAnchorRef = useRef<(() => void) | null>(null);
  const [renderSource, setRenderSource] = useState(value);
  const [labelEditor, setLabelEditor] = useState<LabelEditorState | null>(null);
  sourceRef.current = value;
  onChangeRef.current = onChange;
  onSelectRef.current = onSelect;
  onPreviewChangeRef.current = onPreviewChange;
  const hasPreviewHandler = onPreviewChange !== undefined;

  // A fixed-position editor is anchored to one exact render. Close it as soon
  // as any controlled render input changes instead of waiting for a debounced
  // SVG replacement to detach the old interaction listeners.
  useEffect(() => {
    cancelLabelEditRef.current?.();
  }, [fontFamily, padding, readOnly, theme, type, value]);

  useEffect(() => {
    if (debounceMs <= 0) {
      setRenderSource(value);
      return;
    }
    const timer = window.setTimeout(() => setRenderSource(value), debounceMs);
    return () => window.clearTimeout(timer);
  }, [debounceMs, value]);

  const result = useMemo(
    () => renderResult(renderSource, { type, theme, fontFamily, padding, scene: !readOnly }),
    [fontFamily, padding, readOnly, renderSource, theme, type],
  );
  const scene = result.ok ? result.scene ?? [] : [];
  const revision = useMemo(() => sourceRevision(renderSource), [renderSource]);
  const viewportEnabled = useDiagramViewport({
    viewport,
    onViewportChange,
    viewportRef,
    frameRef,
    hostRef,
    structuralKey: result.type ?? type ?? "",
    contentKey: result.svg,
    onInternalChange: () => syncLabelAnchorRef.current?.(),
  });

  useEffect(() => {
    onRender?.(result);
    const error = renderError(result);
    if (error) onError?.(error);
  }, [onError, onRender, result]);

  const selectItem = useCallback((item: SceneItem | null) => {
    selectedRef.current = item;
    onSelectRef.current?.(item);
  }, []);

  useEffect(() => {
    if (readOnly || !result.ok || scene.length === 0) return;
    const svg = hostRef.current?.querySelector<SVGSVGElement>("svg");
    if (!svg) return;
    const detach = attachInteraction(svg, {
      getSource: () => sourceRef.current,
      getScene: () => ({ rev: revision, items: scene }),
      onSelect: selectItem,
      onRequestLabelEdit: (item, anchor, commit, cancel) => {
        cancelLabelEditRef.current = cancel;
        setLabelEditor({
          item,
          anchor,
          draft: item.label ?? "",
          draftWidth: anchor.rect.width,
          commit,
          cancel,
        });
      },
      onLabelEditEnd: () => {
        cancelLabelEditRef.current = null;
        setLabelEditor(null);
      },
      onSourceChange: (source, reason) => {
        onChangeRef.current(source, { reason, item: selectedRef.current });
        setLabelEditor(null);
      },
      onSourcePreview: hasPreviewHandler
        ? (source, reason) => onPreviewChangeRef.current?.(source, { reason, item: selectedRef.current })
        : undefined,
    });
    return detach;
  }, [hasPreviewHandler, readOnly, result.ok, revision, scene, selectItem]);

  useEffect(() => {
    if (selectedKey === undefined) return;
    const svg = hostRef.current?.querySelector<SVGSVGElement>("svg");
    if (!svg) return;
    svg.querySelectorAll<SVGElement>("[data-sx-key]").forEach((element) => {
      element.classList.toggle(
        "sx-interactive-selected",
        selectedKey !== null &&
          element.getAttribute("data-sx-key") === selectedKey,
      );
    });
    selectedRef.current = selectedKey
      ? scene.find((item) => item.key === selectedKey) ?? null
      : null;
  }, [result.svg, scene, selectedKey]);

  useEffect(() => {
    const key = labelEditor?.item.key;
    const measureRect = labelEditor?.anchor.measureRect;
    const remeasure = labelEditor?.anchor.remeasure;
    if (!key || !measureRect) return;
    let frame = 0;
    const syncAnchor = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setLabelEditor((current) => {
          if (!current || current.item.key !== key) return current;
          const anchor = remeasure?.() ?? {
            ...current.anchor,
            rect: measureRect(),
          };
          const previous = current.anchor;
          return previous.rect.left === anchor.rect.left &&
            previous.rect.top === anchor.rect.top &&
            previous.rect.width === anchor.rect.width &&
            previous.rect.height === anchor.rect.height &&
            previous.fontSize === anchor.fontSize &&
            previous.fontFamily === anchor.fontFamily &&
            previous.fontWeight === anchor.fontWeight &&
            previous.fontStyle === anchor.fontStyle &&
            previous.letterSpacing === anchor.letterSpacing &&
            previous.color === anchor.color
            ? current
            : {
                ...current,
                anchor,
                draftWidth: measureDraftWidth(anchor, current.draft),
              };
        });
      });
    };
    syncAnchor();
    syncLabelAnchorRef.current = syncAnchor;
    window.addEventListener("resize", syncAnchor);
    window.addEventListener("scroll", syncAnchor, true);
    return () => {
      if (syncLabelAnchorRef.current === syncAnchor) syncLabelAnchorRef.current = null;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncAnchor);
      window.removeEventListener("scroll", syncAnchor, true);
    };
  }, [labelEditor?.anchor.measureRect, labelEditor?.anchor.remeasure, labelEditor?.item.key]);

  const overlay = labelEditor && typeof document !== "undefined"
    ? createPortal(
        <input
          key={labelEditor.item.key}
          className={labelEditorClassName}
          style={{ ...defaultLabelEditorStyle(labelEditor), ...labelEditorStyle }}
          aria-label={`Edit ${labelEditor.item.label ?? "diagram label"}`}
          autoFocus
          value={labelEditor.draft}
          onChange={(event) => {
            const draft = event.currentTarget.value;
            setLabelEditor((current) => current
              ? { ...current, draft, draftWidth: measureDraftWidth(current.anchor, draft) }
              : current);
          }}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={(event) => {
            labelEditor.commit(event.currentTarget.value);
            setLabelEditor(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              labelEditor.cancel();
              setLabelEditor(null);
            }
          }}
        />,
        document.body,
      )
    : null;
  // Keep the exact SVG host DOM node alive across callback/state-only renders.
  // Replacing an equal `dangerouslySetInnerHTML` subtree would strand native
  // listeners on the detached SVG until the next source render.
  const svgHost = useMemo(() => (
    <div
      ref={hostRef}
      className={canvasClassName}
      data-schematex-viewport-host={viewportEnabled ? "true" : undefined}
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
  ), [canvasClassName, result.svg, viewportEnabled]);

  return (
    <div
      ref={frameRef}
      className={`schematex-interactive-editor ${className ?? ""}`.trim()}
      style={style}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      data-schematex-editor="true"
      data-schematex-viewport={viewportEnabled ? "true" : undefined}
    >
      <style>{INTERACTIVE_STYLES}</style>
      {svgHost}
      {overlay}
    </div>
  );
}
