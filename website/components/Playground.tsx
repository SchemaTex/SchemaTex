'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import dynamic from 'next/dynamic';
import { getInteractiveCapabilities, renderResult, setPosition, type SceneItem, type SchematexRenderResult } from 'schematex';
import { InteractiveSchematexDiagram } from 'schematex/react';
import type { ViewportController, ViewportOptions } from 'schematex/interactive';
import { svgToPngBlob, downloadBlob, printSvgAsPdf, withWhiteSvgBackground } from 'schematex/export';
import type { Monaco, OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import type { DiagramTypeOption } from './DiagramExampleBrowser';
import { PlaygroundShell } from './PlaygroundShell';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-[color:var(--fill-muted)]" />
  ),
});

interface PlaygroundProps {
  initial: string;
  height?: number;
  /** When true, fill the parent container's height. */
  fill?: boolean;
  /**
   * When true, read/write the editor contents via the URL hash (`#s=...`).
   * Enables shareable-link behavior on single-Playground pages. Must be
   * left off (default) on pages with multiple Playgrounds, otherwise they
   * will race to write the same hash and overwrite each other's `initial`
   * on mount — causing every Playground on the page to show the same DSL.
   */
  syncHash?: boolean;
  /** Canonical registry metadata; supplied by the full-screen workspace. */
  types?: DiagramTypeOption[];
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenLibrary?: (trigger: HTMLButtonElement) => void;
  emptyExampleCount?: number;
}

type MonacoEditorInstance = Parameters<OnMount>[0];

// ── Share links ────────────────────────────────────────────────────────────
// The document lives in the URL hash so sharing needs no backend and the DSL
// never leaves the browser. Two rules keep the URL short:
//   1. the hash is written only when the user actually shares (see handleShare),
//      never on every keystroke;
//   2. an unmodified specimen shares as `?example=slug` instead.
// `#z=` is gzip+base64url (25–50% shorter, growing with document size); `#s=`
// is the original raw base64 and is still decoded, so links shared before this
// change keep working.

const MAX_SHARE_SOURCE_BYTES = 256 * 1024;
const MAX_SHARE_ENCODED_CHARS = 384 * 1024;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]*$/;

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  if (s.length > MAX_SHARE_ENCODED_CHARS || !BASE64_URL_PATTERN.test(s)) {
    throw new RangeError('Share payload is too large or malformed.');
  }
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function collectStream(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel('Share payload exceeds the safe size limit.');
        throw new RangeError('Share payload exceeds the safe size limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Returns the hash fragment (without `#`) for `text`, gzipped when supported. */
async function encodeShare(text: string): Promise<string> {
  const raw = new TextEncoder().encode(text);
  if (raw.length > MAX_SHARE_SOURCE_BYTES) {
    throw new RangeError('This diagram is too large for a browser-only share link.');
  }
  if (typeof CompressionStream === 'function') {
    try {
      const gzipped = await collectStream(
        new Blob([raw as BlobPart]).stream().pipeThrough(new CompressionStream('gzip')),
        MAX_SHARE_SOURCE_BYTES,
      );
      if (gzipped.length < raw.length) return `z=${bytesToBase64Url(gzipped)}`;
    } catch {
      /* fall through to the uncompressed form */
    }
  }
  return `s=${bytesToBase64Url(raw)}`;
}

async function decodeShare(hash: string): Promise<string | null> {
  try {
    if (hash.startsWith('s=')) {
      const bytes = base64UrlToBytes(hash.slice(2));
      if (bytes.length > MAX_SHARE_SOURCE_BYTES) return null;
      return new TextDecoder().decode(bytes);
    }
    if (hash.startsWith('z=') && typeof DecompressionStream === 'function') {
      const bytes = base64UrlToBytes(hash.slice(2));
      const inflated = await collectStream(
        new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')),
        MAX_SHARE_SOURCE_BYTES,
      );
      return new TextDecoder().decode(inflated);
    }
  } catch {
    /* malformed or truncated link — fall back to the route's example */
  }
  return null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function positionGlyph(position: string): string {
  if (position === 'move-x' || position === 'native-x') return '↔';
  if (position === 'move-y' || position === 'native-y') return '↕';
  if (position === 'none') return '⃠';
  return '✥';
}

function positionText(position: string): string {
  switch (position) {
    case 'free': return 'free move';
    case 'move-x': return 'horizontal move';
    case 'move-y': return 'vertical move';
    case 'cross-axis': return 'cross-axis move';
    case 'native-x': return 'native x handles';
    case 'native-y': return 'native y handles';
    case 'native-xy': return 'native xy handles';
    default: return 'position locked';
  }
}

function formatSceneRange(item: SceneItem | null): string | null {
  const range = item?.sourceRange ?? item?.positionSource?.range;
  return range
    ? `L${range.line + 1} C${range.colStart + 1}–L${range.line + 1} C${range.colEnd + 1}`
    : null;
}

const SPLIT_STORAGE_KEY = 'schematex:playground:editor-split';
const ONBOARDING_STORAGE_KEY = 'schematex:playground:onboarding-v1';
const PLAYGROUND_LABEL_EDITOR_STYLE: CSSProperties = {
  background: 'var(--fill)',
  borderColor: 'var(--accent)',
  outlineColor: 'color-mix(in srgb, var(--accent) 18%, transparent)',
};
const PLAYGROUND_VIEWPORT_OPTIONS = {
  minScale: 0.1,
  maxScale: 4,
  wheelRequiresModifier: false,
} satisfies ViewportOptions;

export function Playground({
  initial,
  height = 560,
  fill = false,
  syncHash = false,
  types = [],
  sidebarCollapsed = false,
  onToggleSidebar,
  onOpenLibrary,
  emptyExampleCount,
}: PlaygroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState(initial);
  const [renderState, setRenderState] = useState<{
    result: SchematexRenderResult | null;
    renderMs: number;
    svgBytes: number;
  }>({ result: null, renderMs: 0, svgBytes: 0 });
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'done' | 'too-large'>('idle');
  const [exportOpen, setExportOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  // Canvas-weighted: with round-trip editing the diagram is the working
  // surface and the source is the input, so they are not equal partners.
  const [split, setSplit] = useState(42);
  const [renderEpoch, setRenderEpoch] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SceneItem | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<ViewportController>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const cursorDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const decorationIds = useRef<string[]>([]);
  const textRef = useRef(text);
  const sceneRef = useRef<SceneItem[]>([]);
  const previewBaseRef = useRef<string | null>(null);
  const suppressEditorChangeRef = useRef(false);
  const renderStartedRef = useRef(0);
  const hydrated = useRef(false);
  const previousInitialRef = useRef(initial);

  const isDark = mounted && resolvedTheme === 'dark';
  const rendererTheme = isDark ? 'dark' : 'default';

  useEffect(() => {
    setMounted(true);
    const storedSplit = Number(window.localStorage.getItem(SPLIT_STORAGE_KEY));
    if (Number.isFinite(storedSplit) && storedSplit >= 25 && storedSplit <= 75) {
      setSplit(storedSplit);
    }
  }, []);

  textRef.current = text;

  useEffect(() => {
    if (previousInitialRef.current === initial) return;
    previousInitialRef.current = initial;
    previewBaseRef.current = null;
    textRef.current = initial;
    setText(initial);
    setSelectedKey(null);
    setSelectedItem(null);
    const editor = editorRef.current;
    if (editor && decorationIds.current.length > 0) {
      decorationIds.current = editor.deltaDecorations(decorationIds.current, []);
    }
  }, [initial]);

  useEffect(() => {
    if (!syncHash || hydrated.current) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      hydrated.current = true;
      return;
    }
    let active = true;
    // A shared document wins over `?example=`; that is the whole point of the
    // link. Anything malformed falls back to the route's example.
    //
    // `hydrated` is only latched once the decode actually lands. Latching it up
    // front would make StrictMode's mount → cleanup → mount cycle discard the
    // first decode and then skip the retry, silently dropping shared links.
    void decodeShare(hash).then((decoded) => {
      if (!active || !decoded) return;
      hydrated.current = true;
      setText(decoded);
    });
    return () => { active = false; };
  }, [syncHash]);

  useEffect(() => {
    renderStartedRef.current = performance.now();
  }, [text]);

  const result = renderState.result;
  const scene = result?.ok ? result.scene ?? [] : [];
  sceneRef.current = scene;
  const error = result && !result.ok
    ? result.diagnostics[0]?.message ?? 'Unable to render this diagram.'
    : null;
  const { renderMs, svgBytes } = renderState;

  const handleRender = useCallback((nextResult: SchematexRenderResult) => {
    const end = performance.now();
    setRenderState({
      result: nextResult,
      renderMs: renderStartedRef.current > 0
        ? Math.max(0, end - renderStartedRef.current)
        : 0,
      svgBytes: new TextEncoder().encode(nextResult.svg).length,
    });
  }, []);

  const triggerRender = useCallback(() => {
    renderStartedRef.current = performance.now();
    setRenderEpoch((epoch) => epoch + 1);
  }, []);

  const handleEditorMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    cursorDisposableRef.current?.dispose();
    // Annotate the event explicitly: `monaco-editor` is only a transitive dep
    // of `@monaco-editor/react`, so a fresh CI/Vercel `npm install` can fail to
    // resolve its types and widen `editor` to `any` — which turns this
    // destructured param into an implicit-any build error even though local
    // installs type-check fine. The explicit shape is contravariantly
    // compatible with the real ICursorPositionChangedEvent.
    cursorDisposableRef.current = editor.onDidChangeCursorPosition(
      ({ position }: { position: { lineNumber: number; column: number } }) => {
      const candidates = sceneRef.current.flatMap((item) => {
        const ranges = [item.sourceRange, item.positionSource?.range].filter(
          (range): range is NonNullable<typeof range> => Boolean(range),
        );
        return ranges
          .filter((range) => range.line === position.lineNumber - 1)
          .map((range) => ({
            item,
            range,
            exact: position.column - 1 >= range.colStart && position.column - 1 <= range.colEnd,
            distance: Math.min(
              Math.abs(position.column - 1 - range.colStart),
              Math.abs(position.column - 1 - range.colEnd),
            ),
          }));
      }).sort((a, b) => Number(b.exact) - Number(a.exact) || a.distance - b.distance ||
        (a.range.end - a.range.start) - (b.range.end - b.range.start));
      const item = candidates[0]?.item ?? null;
      setSelectedKey(item?.key ?? null);
      setSelectedItem(item);
    });
  }, []);

  const highlightSource = useCallback((item: SceneItem | null) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const range = item?.sourceRange ?? item?.positionSource?.range;
    const decorations = range
      ? [{
          range: new monaco.Range(
            range.line + 1,
            range.colStart + 1,
            range.line + 1,
            Math.max(range.colStart + 2, range.colEnd + 1),
          ),
          options: {
            inlineClassName: 'sx-monaco-selection',
            className: 'sx-monaco-selection-line',
          },
        }]
      : [];
    decorationIds.current = editor.deltaDecorations(decorationIds.current, decorations);
    if (range) {
      editor.setSelection(new monaco.Range(
        range.line + 1,
        range.colStart + 1,
        range.line + 1,
        Math.max(range.colStart + 2, range.colEnd + 1),
      ));
      editor.revealLineInCenterIfOutsideViewport(range.line + 1);
    }
  }, []);

  const replaceModelWithoutUndo = useCallback((nextSource: string) => {
    const model = editorRef.current?.getModel();
    if (!model || model.getValue() === nextSource) return;
    suppressEditorChangeRef.current = true;
    try {
      model.applyEdits([{ range: model.getFullModelRange(), text: nextSource }]);
    } finally {
      suppressEditorChangeRef.current = false;
    }
  }, []);

  const applySourceEdit = useCallback((nextSource: string) => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (editor && model) {
      editor.pushUndoStop();
      editor.executeEdits('schematex-interaction', [{
        range: model.getFullModelRange(),
        text: nextSource,
        forceMoveMarkers: true,
      }]);
      editor.pushUndoStop();
    }
    textRef.current = nextSource;
    setText(nextSource);
  }, []);

  const handleCanvasSelect = useCallback((item: SceneItem | null) => {
    setSelectedKey(item?.key ?? null);
    setSelectedItem(item);
    highlightSource(item);
  }, [highlightSource]);

  const handleCanvasChange = useCallback((nextSource: string) => {
    const previewBase = previewBaseRef.current;
    if (previewBase !== null) {
      previewBaseRef.current = null;
      replaceModelWithoutUndo(previewBase);
    }
    applySourceEdit(nextSource);
  }, [applySourceEdit, replaceModelWithoutUndo]);

  const handleCanvasPreview = useCallback((nextSource: string | null) => {
    if (nextSource === null) {
      const previewBase = previewBaseRef.current;
      previewBaseRef.current = null;
      if (previewBase !== null) replaceModelWithoutUndo(previewBase);
      return;
    }
    if (previewBaseRef.current === null) previewBaseRef.current = textRef.current;
    replaceModelWithoutUndo(nextSource);
  }, [replaceModelWithoutUndo]);

  const handleViewportChange = useCallback(({ scale }: { scale: number }) => {
    setZoom(Math.round(scale * 100));
  }, []);

  /**
   * Monaco caches its dimensions and `automaticLayout` does not reliably catch
   * a grid track collapsing underneath it. The sidebar auto-collapses during
   * mount on narrower viewports, which otherwise leaves the editor measured
   * against a stale box and painting nothing at all.
   */
  useEffect(() => {
    const pane = splitRef.current;
    if (!pane || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => editorRef.current?.layout());
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // The sidebar fades over .12s, so re-measure once the transition settles.
    const id = window.setTimeout(() => editorRef.current?.layout(), 180);
    return () => window.clearTimeout(id);
  }, [sidebarCollapsed]);

  useEffect(() => () => {
    cursorDisposableRef.current?.dispose();
    const editor = editorRef.current;
    if (editor && decorationIds.current.length > 0) {
      editor.deltaDecorations(decorationIds.current, []);
    }
  }, []);

  const activeType = result?.type ?? null;
  const typeMeta = useMemo(
    () => types.find((entry) => entry.type === activeType),
    [activeType, types],
  );
  const meta = {
    name: typeMeta?.name ?? activeType ?? 'schematex',
    std: typeMeta?.standard ?? 'source-defined',
    stdAlso: typeMeta?.standardAlso,
  };
  const fullCitation = [`${meta.name} · § ${meta.std}`, ...(meta.stdAlso ?? [])].join('\n');
  const capability = activeType ? getInteractiveCapabilities(activeType) : null;
  const lineCount = useMemo(() => text.split('\n').length, [text]);
  const charCount = useMemo(() => text.length, [text]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      /* noop */
    }
  }, [text]);

  const handleShare = useCallback(async () => {
    try {
      const url = new URL(window.location.href);
      // Untouched specimen → share the short `?example=` route rather than
      // embedding a copy of a document the receiver can already resolve.
      url.hash = text === initial ? '' : `#${await encodeShare(text)}`;
      const href = url.toString().replace(/#$/, '');
      window.history.replaceState(null, '', href);
      await navigator.clipboard.writeText(href);
      setShareState('done');
      setTimeout(() => setShareState('idle'), 1500);
    } catch (error) {
      if (error instanceof RangeError) {
        setShareState('too-large');
        setTimeout(() => setShareState('idle'), 2500);
      }
    }
  }, [initial, text]);

  const getExportSvg = useCallback(() => {
    const exported = renderResult(text, { theme: 'default' });
    return exported.ok ? withWhiteSvgBackground(exported.svg) : null;
  }, [text]);

  const handleDownloadSvg = useCallback(() => {
    const exportSvg = getExportSvg();
    if (!exportSvg) return;
    const blob = new Blob([exportSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.name || 'diagram'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getExportSvg, meta.name]);

  const handleDownloadPng = useCallback(async () => {
    const exportSvg = getExportSvg();
    if (!exportSvg) return;
    try {
      const blob = await svgToPngBlob(exportSvg, { scale: 2, background: 'white' });
      downloadBlob(blob, `${meta.name || 'diagram'}.png`);
    } catch {
      /* noop — browser may block in certain environments */
    }
  }, [getExportSvg, meta.name]);

  const handlePrintPdf = useCallback(() => {
    const exportSvg = getExportSvg();
    if (exportSvg) printSvgAsPdf(exportSvg, meta.name || 'diagram');
  }, [getExportSvg, meta.name]);

  const handleSplitPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!splitRef.current || window.matchMedia('(max-width: 767px)').matches) return;
    event.preventDefault();
    const container = splitRef.current;
    const onMove = (moveEvent: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      const next = Math.max(25, Math.min(75, ((moveEvent.clientX - bounds.left) / bounds.width) * 100));
      setSplit(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setSplit((current) => {
        window.localStorage.setItem(SPLIT_STORAGE_KEY, current.toFixed(2));
        return current;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        triggerRender();
      } else if (event.key === '0') {
        event.preventDefault();
        viewportRef.current?.reset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerRender]);

  useEffect(() => {
    if (!syncHash || scene.length === 0 || !editorRef.current || !canvasRef.current) return;
    if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'done') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const item = scene.find((entry) => entry.editable.position !== 'none' && entry.bbox);
    if (!item?.bbox) return;
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'done');
    setSelectedKey(item.key);
    setSelectedItem(item);
    highlightSource(item);
    const dx = item.editable.position === 'move-y' ? 0 : 18;
    const dy = item.editable.position === 'move-x' ? 0 : 14;
    const edited = setPosition(textRef.current, item, {
      x: item.bbox.x + dx,
      y: item.bbox.y + dy,
    });
    const element = Array.from(canvasRef.current.querySelectorAll<SVGElement>('[data-sx-key]'))
      .find((entry) => entry.getAttribute('data-sx-key') === item.key);
    const animation = element?.animate([
      { transform: 'translate(0, 0)' },
      { transform: `translate(${dx}px, ${dy}px)`, offset: 0.62 },
      { transform: 'translate(0, 0)' },
    ], { duration: 1800, easing: 'cubic-bezier(.2,.8,.2,1)' });
    const previewTimer = window.setTimeout(() => {
      if (edited.diagnostics.length === 0 && edited.source !== textRef.current) {
        handleCanvasPreview(edited.source);
      }
    }, 650);
    const resetTimer = window.setTimeout(() => handleCanvasPreview(null), 1700);
    return () => {
      animation?.cancel();
      window.clearTimeout(previewTimer);
      window.clearTimeout(resetTimer);
      handleCanvasPreview(null);
    };
  }, [handleCanvasPreview, highlightSource, scene, syncHash]);

  useEffect(() => {
    if (!exportOpen) return;
    function onClickAway(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [exportOpen]);

  const actions = (
    <>
      {onOpenLibrary && (
        <button
          type="button"
          className="pg-mini pg-library-action"
          onClick={(event) => onOpenLibrary(event.currentTarget)}
        >
          library
          <span className="pg-kbd">⌘K</span>
        </button>
      )}
      <button type="button" onClick={handleCopy} className="pg-mini">
        {copyState === 'done' ? 'copied' : 'copy'}
      </button>
      <button type="button" onClick={handleShare} className="pg-mini">
        {shareState === 'done' ? 'link copied' : shareState === 'too-large' ? 'too large to share' : 'share'}
      </button>
      <div ref={exportRef} className="relative">
        <button
          type="button"
          onClick={() => setExportOpen((o) => !o)}
          className="pg-mini"
        >
          export ↓
        </button>
        {exportOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1 flex flex-col overflow-hidden"
            style={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)',
              background: 'var(--bg)',
              minWidth: 100,
            }}
          >
            {[
              { label: '.svg', desc: 'vector', action: handleDownloadSvg },
              { label: '.png', desc: '@2× raster', action: handleDownloadPng },
              { label: '.pdf', desc: 'print-ready', action: handlePrintPdf },
            ].map(({ label, desc, action }) => (
              <button
                key={label}
                type="button"
                onClick={() => { action(); setExportOpen(false); }}
                className="flex w-full items-center justify-between px-2.5 py-1.5 font-mono text-xs transition"
                style={{ color: 'var(--text)', borderRadius: 'var(--r-sm)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--fill-muted)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {label}
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {onToggleSidebar && (
        <button type="button" onClick={onToggleSidebar} className="pg-mini pg-sidebar-action">
          {sidebarCollapsed ? 'show library' : 'hide library'}
          <span className="pg-kbd">⌘\</span>
        </button>
      )}
      <button
        type="button"
        className="pg-mini pg-mini-primary pg-render-action"
        onClick={triggerRender}
      >
        render
        <span className="pg-kbd">⌘↵</span>
      </button>
    </>
  );

  const selectedRange = formatSceneRange(selectedItem);

  const identity = (
    <>
      <div className="sx-command-identity" title={fullCitation}>
        <span className="sx-command-name">{meta.name}</span>
        <span className="sx-command-standard">§ {meta.std}</span>
      </div>
      {capability && (
        <div className="sx-command-caps">
          <span>
            <b>{capability.text.length > 0 ? '✎' : '⌨'}</b>{' '}
            {capability.text.length > 0 ? capability.text.join(' · ') : 'source editing'}
          </span>
          <span
            className={capability.reason ? 'sx-capability-explained' : undefined}
            title={capability.reason}
            tabIndex={capability.reason ? 0 : undefined}
          >
            <b>{positionGlyph(capability.position)}</b> {positionText(capability.position)}
          </span>
        </div>
      )}
    </>
  );

  const status = (
    <>
      <span>{lineCount} line{lineCount === 1 ? '' : 's'} · {charCount} chars</span>
      {selectedItem && (
        <span className="sx-status-selection" aria-live="polite">
          <b>▣</b> {selectedItem.key}
          {selectedRange && <span>{selectedRange}</span>}
          <span>
            {selectedItem.editable.label ? '✎ label' : 'label locked'} ·{' '}
            {positionGlyph(selectedItem.editable.position)} {positionText(selectedItem.editable.position)}
          </span>
        </span>
      )}
      <div className="sx-status-right">
        {emptyExampleCount !== undefined ? (
          <span>⌘K to choose an example</span>
        ) : error ? (
          <span style={{ color: 'var(--negative)' }}>✗ parse error</span>
        ) : (
          <span>
            <span style={{ color: 'var(--positive)' }}>✓ parsed</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span style={{ color: 'var(--accent)' }} suppressHydrationWarning>{renderMs.toFixed(1)} ms</span>
            <span className="mx-1.5 opacity-40">·</span>
            {formatBytes(svgBytes)}
          </span>
        )}
        <div className="sx-status-zoom">
          <button type="button" onClick={() => viewportRef.current?.fit()} aria-label="Fit diagram to preview">fit</button>
          <button type="button" onClick={() => viewportRef.current?.zoomOut(0.25)} aria-label="Zoom out">−</button>
          <span style={{ minWidth: 34, textAlign: 'center' }}>{zoom}%</span>
          <button type="button" onClick={() => viewportRef.current?.zoomIn(0.25)} aria-label="Zoom in">+</button>
        </div>
      </div>
    </>
  );

  return (
    <PlaygroundShell
      identity={identity}
      actions={actions}
      status={status}
      className={fill ? 'h-full' : ''}
      style={fill ? undefined : { height }}
    >
      <div
        ref={splitRef}
        className="sx-editor-split"
        style={{ '--editor-split': `${split}%` } as CSSProperties}
      >
        <div
          className="sx-source-pane"
          style={{ background: 'var(--fill-muted)' }}
        >
          <MonacoEditor
            key={`monaco-${rendererTheme}`}
            height="100%"
            defaultLanguage="plaintext"
            value={text}
            onChange={(v) => {
              if (suppressEditorChangeRef.current) return;
              previewBaseRef.current = null;
              const next = v ?? '';
              textRef.current = next;
              setText(next);
            }}
            onMount={handleEditorMount}
            theme={isDark ? 'vs-dark' : 'vs'}
            options={{
              fontSize: 13,
              fontFamily: 'var(--mono)',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'none',
              padding: { top: 12, bottom: 12 },
              automaticLayout: true,
              tabSize: 2,
              scrollbar: { alwaysConsumeMouseWheel: false },
            }}
          />
        </div>
        <button
          type="button"
          className="sx-split-handle"
          onPointerDown={handleSplitPointerDown}
          aria-label={`Resize source editor, currently ${Math.round(split)} percent`}
          title="Drag to resize source and preview"
        />
        <div className="sx-preview-pane">
          <div ref={canvasRef} className="dot-grid relative flex flex-1 items-center justify-center overflow-auto p-6">
            <InteractiveSchematexDiagram
              key={`${rendererTheme}:${renderEpoch}`}
              value={text}
              onChange={handleCanvasChange}
              onPreviewChange={handleCanvasPreview}
              onSelect={handleCanvasSelect}
              onRender={handleRender}
              selectedKey={selectedKey}
              theme={rendererTheme}
              debounceMs={120}
              ariaLabel="Interactive diagram preview"
              labelEditorStyle={PLAYGROUND_LABEL_EDITOR_STYLE}
              className="flex h-full w-full items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
              canvasClassName="flex h-full w-full items-center justify-center [&_svg]:block [&_svg]:max-h-full [&_svg]:max-w-full"
              viewport={PLAYGROUND_VIEWPORT_OPTIONS}
              viewportRef={viewportRef}
              onViewportChange={handleViewportChange}
            />
            {emptyExampleCount !== undefined && (
              <p className="sx-canvas-caption sx-empty-canvas-prompt">
                ⌘K to browse {emptyExampleCount} examples
              </p>
            )}
            {emptyExampleCount === undefined && error && (
              <div className="sx-playground-error pointer-events-none absolute inset-x-4 top-4 z-10 rounded-sm border border-[color:var(--negative)] px-3 py-2 font-mono text-xs text-[color:var(--negative)]">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </PlaygroundShell>
  );
}
