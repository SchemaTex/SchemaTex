'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { render } from 'schematex';

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
}

const TYPE_META: Record<string, { name: string; std: string }> = {
  genogram: { name: 'genogram', std: 'McGoldrick' },
  ecomap: { name: 'ecomap', std: 'Hartman 1978' },
  pedigree: { name: 'pedigree', std: 'ISCN / Bennett' },
  phylo: { name: 'phylogenetic', std: 'Newick / NHX' },
  phylogenetic: { name: 'phylogenetic', std: 'Newick / NHX' },
  sociogram: { name: 'sociogram', std: 'Moreno' },
  timing: { name: 'timing', std: 'WaveJSON' },
  'logic-gate': { name: 'logic-gate', std: 'IEEE 91-1984' },
  logic: { name: 'logic-gate', std: 'IEEE 91-1984' },
  circuit: { name: 'circuit', std: 'IEEE 315' },
  ladder: { name: 'ladder', std: 'IEC 61131-3' },
  sld: { name: 'SLD', std: 'IEEE 315-1975' },
  'single-line': { name: 'SLD', std: 'IEEE 315-1975' },
  block: { name: 'block', std: 'ISO 5807' },
  'entity-structure': { name: 'entity-structure', std: 'Corporate' },
  entity: { name: 'entity-structure', std: 'Corporate' },
  fishbone: { name: 'fishbone', std: 'Ishikawa 1968' },
  ishikawa: { name: 'fishbone', std: 'Ishikawa 1968' },
};

function detectType(dsl: string): { name: string; std: string } {
  const firstLine = dsl.trimStart().split('\n', 1)[0] ?? '';
  const head = firstLine.split(/\s+/, 1)[0]?.toLowerCase() ?? '';
  return TYPE_META[head] ?? { name: head || 'schematex', std: '—' };
}

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

export function Playground({ initial, height = 560, fill = false }: PlaygroundProps) {
  const [text, setText] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'done'>('idle');
  const [exportOpen, setExportOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const exportRef = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const hash = window.location.hash.replace(/^#/, '');
    if (hash.startsWith('s=')) {
      const decoded = decodeShare(hash.slice(2));
      if (decoded) {
        setText(decoded);
        setDebounced(decoded);
      }
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(text), 120);
    return () => clearTimeout(id);
  }, [text]);

  useEffect(() => {
    const id = setTimeout(() => {
      const encoded = encodeShare(debounced);
      if (encoded) {
        const url = new URL(window.location.href);
        url.hash = `s=${encoded}`;
        window.history.replaceState(null, '', url.toString());
      }
    }, 400);
    return () => clearTimeout(id);
  }, [debounced]);

  const { svg, error, renderMs, svgBytes } = useMemo(() => {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const out = render(debounced);
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const bytes = new TextEncoder().encode(out).length;
      return {
        svg: out,
        error: null as string | null,
        renderMs: end - start,
        svgBytes: bytes,
      };
    } catch (e) {
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const msg = e instanceof Error ? e.message : String(e);
      return { svg: null, error: msg, renderMs: end - start, svgBytes: 0 };
    }
  }, [debounced]);

  const meta = useMemo(() => detectType(text), [text]);
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

  const handleDownloadSvg = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.name || 'diagram'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svg, meta.name]);

  const handleDownloadPng = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = (img.width || 800) * scale;
      canvas.height = (img.height || 600) * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${meta.name || 'diagram'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.src = svgUrl;
  }, [svg, meta.name]);

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

  const panelStyle: React.CSSProperties = {
    border: '1px solid var(--fill-muted)',
    borderRadius: 'var(--r)',
    background: 'var(--bg)',
    ...(fill ? {} : { height }),
  };

  return (
    <div
      className={fill ? 'flex h-full flex-col overflow-hidden' : 'flex flex-col overflow-hidden'}
      style={panelStyle}
    >
      {/* Title bar: dots + mono title + mini actions */}
      <div
        className="flex shrink-0 items-center gap-3 px-3 py-2"
        style={{ borderBottom: '1px solid var(--fill-muted)' }}
      >
        <div className="flex gap-1.5">
          <span className="size-[9px] rounded-full" style={{ background: 'var(--fill-muted)' }} />
          <span className="size-[9px] rounded-full" style={{ background: 'var(--fill-muted)' }} />
          <span className="size-[9px] rounded-full" style={{ background: 'var(--fill-muted)' }} />
        </div>
        <div className="font-mono text-[13px] text-fd-foreground">
          {meta.name}
          <span className="mx-2 opacity-40">·</span>
          <span style={{ color: 'var(--accent)' }}>§ {meta.std}</span>
        </div>
        <div className="ml-auto flex gap-1.5 font-mono">
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
                  border: '1px solid var(--fill-muted)',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--bg)',
                  minWidth: 100,
                }}
              >
                {[
                  { label: '.svg', desc: 'vector', action: handleDownloadSvg },
                  { label: '.png', desc: '@2× raster', action: handleDownloadPng },
                  { label: '.pdf', desc: 'print-ready', action: () => {} },
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
          <span className="pg-mini pg-mini-primary" aria-hidden>
            render
            <span className="pg-kbd">⌘R</span>
          </span>
        </div>
      </div>

      {/* Split: editor + render */}
      <div
        className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2"
        style={{ borderBottom: '1px solid var(--fill-muted)' }}
      >
        <div
          className="min-h-0 overflow-hidden"
          style={{
            background: 'var(--fill-muted)',
            borderRight: '1px solid var(--fill-muted)',
          }}
        >
          <MonacoEditor
            height="100%"
            defaultLanguage="plaintext"
            value={text}
            onChange={(v) => setText(v ?? '')}
            theme="vs"
            options={{
              fontSize: 13,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'none',
              padding: { top: 12, bottom: 12 },
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div
            className="flex shrink-0 items-center justify-between px-3 py-1.5 font-mono text-[11px]"
            style={{ borderBottom: '1px solid var(--fill-muted)', color: 'var(--text-muted)', background: 'var(--fill)' }}
          >
            <span>↘ preview</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(25, z - 25))}
                className="flex size-5 items-center justify-center transition hover:text-[color:var(--text)]"
              >
                −
              </button>
              <span style={{ minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
                className="flex size-5 items-center justify-center transition hover:text-[color:var(--text)]"
              >
                +
              </button>
            </div>
          </div>
          <div className="dot-grid relative flex flex-1 items-center justify-center overflow-auto p-6">
          {error ? (
            <pre
              className="whitespace-pre-wrap font-mono text-sm"
              style={{ color: 'var(--negative)' }}
            >
              {error}
            </pre>
          ) : svg ? (
            <div
              className="[&_svg]:block [&_svg]:max-h-full [&_svg]:max-w-full"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : null}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div
        className="flex shrink-0 items-center justify-between px-3 py-2 font-mono text-[11px] text-fd-muted-foreground"
        style={{ background: 'var(--bg)' }}
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
              <span style={{ color: 'var(--accent)' }}>{renderMs.toFixed(1)} ms</span>
              <span className="mx-1.5 opacity-40">·</span>
              {formatBytes(svgBytes)} SVG
            </>
          )}
        </span>
      </div>
    </div>
  );
}
