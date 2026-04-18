'use client';

import { useEffect, useMemo, useState } from 'react';
import { render } from 'schematex';
import { CopyButton } from './CopyButton';

interface PlaygroundProps {
  initial: string;
  height?: number;
}

export function Playground({ initial, height = 420 }: PlaygroundProps) {
  const [text, setText] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(text), 120);
    return () => clearTimeout(id);
  }, [text]);

  const { svg, error } = useMemo(() => {
    try {
      return { svg: render(debounced), error: null as string | null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { svg: null as string | null, error: msg };
    }
  }, [debounced]);

  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      style={{ minHeight: height }}
    >
      <div className="relative">
        <CopyButton text={text} label="Copy DSL" className="absolute right-3 top-3 z-10" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="w-full resize-none rounded-lg border border-fd-border bg-fd-card p-4 font-mono text-sm text-fd-foreground focus:border-fd-primary focus:outline-none"
          style={{ height }}
        />
      </div>
      <div
        className="relative flex items-center justify-center overflow-auto rounded-lg border border-fd-border bg-white p-4"
        style={{ height }}
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
