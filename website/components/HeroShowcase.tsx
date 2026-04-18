'use client';

import { useEffect, useState } from 'react';

export interface HeroSlide {
  label: string;
  standard: string;
  dsl: string;
  svg: string;
}

interface HeroShowcaseProps {
  slides: HeroSlide[];
  intervalMs?: number;
}

export function HeroShowcase({ slides, intervalMs = 6500 }: HeroShowcaseProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  return (
    <div className="relative">
      {/* Frame */}
      <div className="relative overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-2xl shadow-black/[0.04] dark:shadow-black/40">
        {/* Chrome bar */}
        <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-fd-border" />
            <span className="size-2.5 rounded-full bg-fd-border" />
            <span className="size-2.5 rounded-full bg-fd-border" />
          </div>
          <div className="ml-3 flex items-center gap-2 text-xs text-fd-muted-foreground">
            <span className="font-mono">schematex.render</span>
            <span className="opacity-40">·</span>
            <span>
              {slides[index]?.label}
              <span className="ml-2 opacity-60">{slides[index]?.standard}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* DSL pane */}
          <div className="relative border-b border-fd-border bg-fd-background p-5 md:border-b-0 md:border-r">
            {slides.map((s, i) => (
              <pre
                key={i}
                aria-hidden={i !== index}
                className={`font-mono text-[13px] leading-relaxed text-fd-foreground transition-opacity duration-700 ${
                  i === index
                    ? 'relative opacity-100'
                    : 'pointer-events-none absolute inset-5 opacity-0'
                }`}
              >
                <code>{s.dsl}</code>
              </pre>
            ))}
          </div>

          {/* Render pane */}
          <div className="relative flex min-h-[320px] items-center justify-center bg-white p-6 md:min-h-[420px]">
            {slides.map((s, i) => (
              <div
                key={i}
                aria-hidden={i !== index}
                className={`absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-700 [&_svg]:max-h-full [&_svg]:max-w-full ${
                  i === index ? 'opacity-100' : 'opacity-0'
                }`}
                dangerouslySetInnerHTML={{ __html: s.svg }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Show ${s.label}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index
                ? 'w-8 bg-fd-foreground'
                : 'w-1.5 bg-fd-border hover:bg-fd-muted-foreground'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
