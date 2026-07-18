'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import dynamic from 'next/dynamic';
import { getInteractiveCapabilities, renderResult, setPosition, type SceneItem, type SchematexRenderResult } from 'schematex';
import { InteractiveSchematexDiagram } from 'schematex/react';
import { svgToPngBlob, downloadBlob, printSvgAsPdf, withWhiteSvgBackground } from 'schematex/export';
import type { Monaco, OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { DiagramFrame } from './DiagramFrame';
import type { DiagramTypeOption } from './DiagramExampleBrowser';

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
}

type MonacoEditorInstance = Parameters<OnMount>[0];

// URL-safe base64 (hash fragment)
function encodeShare(s: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const utf8 = new TextEncoder().encode(s);
    let bin = '';
    for (const b of utf8) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

function decodeShare(s: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
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

export function Playground({
  initial,
  height = 560,
  fill = false,
  syncHash = false,
  types = [],
  sidebarCollapsed = false,
  onToggleSidebar,
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
  const [shareState, setShareState] = useState<'idle' | 'done'>('idle');
  const [exportOpen, setExportOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [split, setSplit] = useState(50);
  const [renderEpoch, setRenderEpoch] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SceneItem | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
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
    if (!syncHash) return;
    if (hydrated.current) return;
    hydrated.current = true;
    const hash = window.location.hash.replace(/^#/, '');
    if (hash.startsWith('s=')) {
      const decoded = decodeShare(hash.slice(2));
      if (decoded) {
        setText(decoded);
      }
    }
  }, [syncHash]);

  useEffect(() => {
    renderStartedRef.current = performance.now();
  }, [text]);

  useEffect(() => {
    if (!syncHash) return;
    const id = setTimeout(() => {
      const encoded = encodeShare(text);
      if (encoded) {
        const url = new URL(window.location.href);
        url.hash = `s=${encoded}`;
        window.history.replaceState(null, '', url.toString());
      }
    }, 400);
    return () => clearTimeout(id);
  }, [syncHash, text]);

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
    cursorDisposableRef.current = editor.onDidChangeCursorPosition(({ position }) => {
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
  };
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
      const encoded = encodeShare(text);
      const url = new URL(window.location.href);
      url.hash = `s=${encoded}`;
      await navigator.clipboard.writeText(url.toString());
      setShareState('done');
      setTimeout(() => setShareState('idle'), 1500);
    } catch {
      /* noop */
    }
  }, [text]);

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
        setZoom(100);
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
      <button type="button" onClick={handleCopy} className="pg-mini">
        {copyState === 'done' ? 'copied' : 'copy'}
      </button>
      <button type="button" onClick={handleShare} className="pg-mini">
        {shareState === 'done' ? 'link copied' : 'share'}
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

  const footer = (
    <div
      className="flex shrink-0 items-center justify-between px-3 py-2 font-mono text-[11px] text-fd-muted-foreground"
      style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}
    >
      <span>
        UTF-8 · LF · {lineCount} line{lineCount === 1 ? '' : 's'} · {charCount} chars
      </span>
      <span>
        {error ? (
          <span style={{ color: 'var(--negative)' }}>✗ parse error</span>
        ) : (
          <>
            <span style={{ color: 'var(--positive)' }}>✓ parsed</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span style={{ color: 'var(--accent)' }} suppressHydrationWarning>{renderMs.toFixed(1)} ms</span>
            <span className="mx-1.5 opacity-40">·</span>
            {formatBytes(svgBytes)} SVG
          </>
        )}
      </span>
    </div>
  );

  const selectedRange = formatSceneRange(selectedItem);

  return (
    <DiagramFrame
      diagram={meta.name}
      standard={meta.std}
      actions={actions}
      footer={footer}
      className={fill ? 'h-full' : ''}
      style={fill ? undefined : { height }}
    >
      {capability && (
        <div className="sx-capability-bar" aria-label="Editing contract">
          <div className="sx-capability-summary">
            {capability.text.length > 0 ? (
              <span><b>✎</b> {capability.text.join(' · ')}</span>
            ) : (
              <span><b>⌨</b> source editing</span>
            )}
            <span>
              <b>{positionGlyph(capability.position)}</b> {positionText(capability.position)}
            </span>
          </div>
          {capability.reason && (
            <p className="sx-capability-reason"><b>⃠</b> {capability.reason}</p>
          )}
          {selectedItem && (
            <div className="sx-capability-selection" aria-live="polite">
              <span>▣ {selectedItem.key}</span>
              <span>
                {selectedItem.editable.label ? '✎ label' : 'label locked'} ·{' '}
                {positionGlyph(selectedItem.editable.position)} {positionText(selectedItem.editable.position)}
              </span>
              {selectedRange && <span>{selectedRange}</span>}
            </div>
          )}
        </div>
      )}
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
          <div
            className="flex shrink-0 items-center justify-between px-3 py-1.5 font-mono text-[11px]"
            style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-muted)', background: 'var(--fill)' }}
          >
            <span>↘ preview</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(25, z - 25))}
                className="flex size-5 items-center justify-center transition hover:text-[color:var(--text)]"
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="min-w-9 text-center"
                title="Reset zoom (⌘0)"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
                className="flex size-5 items-center justify-center transition hover:text-[color:var(--text)]"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          </div>
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
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
            />
            {error && (
              <div className="sx-playground-error pointer-events-none absolute inset-x-4 top-4 z-10 rounded-sm border border-[color:var(--negative)] px-3 py-2 font-mono text-xs text-[color:var(--negative)]">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </DiagramFrame>
  );
}
