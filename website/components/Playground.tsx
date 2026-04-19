'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { render } from 'schematex';
import { CopyButton } from './CopyButton';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-lg bg-fd-card" />
  ),
});

interface PlaygroundProps {
  initial: string;
  height?: number;
  /** When true, fill the parent container's height (use h-full layout instead of fixed height). */
  fill?: boolean;
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

export function Playground({ initial, height = 420, fill = false }: PlaygroundProps) {
  const [text, setText] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const hydrated = useRef(false);

  // Read hash on mount
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

  // Debounce render
  useEffect(() => {
    const id = setTimeout(() => setDebounced(text), 120);
    return () => clearTimeout(id);
  }, [text]);

  // Sync hash (debounced)
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

  const { svg, error } = useMemo(() => {
    try {
      return { svg: render(debounced), error: null as string | null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { svg: null as string | null, error: msg };
    }
  }, [debounced]);

  const handleCopyShare = useCallback(async () => {
    try {
      const encoded = encodeShare(text);
      const url = new URL(window.location.href);
      url.hash = `s=${encoded}`;
      await navigator.clipboard.writeText(url.toString());
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 1500);
    } catch {
      /* noop */
    }
  }, [text]);

  const containerClass = fill
    ? 'grid h-full grid-cols-1 gap-3 md:grid-cols-2'
    : 'grid grid-cols-1 gap-3 md:grid-cols-2';
  const paneStyle = fill ? undefined : { height };

  return (
    <div className={containerClass} style={fill ? undefined : { minHeight: height }}>
      <div className="relative overflow-hidden rounded-lg border border-fd-border bg-fd-card">
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <button
            type="button"
            onClick={handleCopyShare}
            className="rounded-md border border-fd-border bg-fd-background/90 px-2.5 py-1 text-xs text-fd-muted-foreground backdrop-blur transition hover:text-fd-foreground"
          >
            {shareState === 'copied' ? 'Copied!' : 'Share link'}
          </button>
          <CopyButton text={text} label="Copy DSL" />
        </div>
        <MonacoEditor
          height={fill ? '100%' : height}
          defaultLanguage="plaintext"
          value={text}
          onChange={(v) => setText(v ?? '')}
          theme="vs"
          options={{
            fontSize: 13,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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
      <div
        className="relative flex items-center justify-center overflow-auto rounded-lg border border-fd-border bg-white p-4"
        style={paneStyle}
      >
        {error ? (
          <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
        ) : svg ? (
          <div
            className="[&_svg]:max-h-full [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}
      </div>
    </div>
  );
}
