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
      <div
        className="relative overflow-hidden bg-fd-card"
        style={{
          border: '1px solid var(--fill-muted)',
          borderRadius: 'var(--r)',
        }}
      >
        {/* Chrome bar — DS traffic-light dots + mono meta, accent for standard */}
        <div
          className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-3.5 py-2.5 font-mono text-xs text-fd-muted-foreground"
          style={{ borderBottom: '1px solid var(--fill-muted)' }}
        >
          <div className="flex gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: 'var(--fill-muted)' }}
            />
            <span
              className="size-2.5 rounded-full"
              style={{ background: 'var(--fill-muted)' }}
            />
            <span
              className="size-2.5 rounded-full"
              style={{ background: 'var(--fill-muted)' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span>schematex.render</span>
            <span className="opacity-40">·</span>
            <span className="text-fd-foreground">{slides[index]?.label}</span>
          </div>
          <span style={{ color: 'var(--accent)' }}>
            {slides[index]?.standard}
          </span>
        </div>

        <div className="grid h-[340px] grid-cols-1 lg:h-[440px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* DSL pane — hidden below lg so narrow screens only show diagram */}
          <div
            className="relative hidden overflow-y-auto p-5 lg:block lg:border-r"
            style={{
              background: 'var(--fill-muted)',
              borderColor: 'var(--fill-muted)',
            }}
          >
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

          {/* Render pane — fills fixed height, diagram centered */}
          <div className="dot-grid relative h-full">
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

      {/* Tab indicators — mono labels, accent underline on active */}
      <div className="mt-4 flex items-center justify-center gap-4 font-mono text-xs">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Show ${s.label}`}
            aria-pressed={i === index}
            className="relative py-1 transition"
            style={{
              color:
                i === index ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            {s.label}
            {i === index && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 h-[2px]"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
