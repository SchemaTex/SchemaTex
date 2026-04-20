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
              style={{ background: 'var(--accent)', opacity: 0.85 }}
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

        <div className="grid h-[340px] grid-cols-1 sm:h-[500px] sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:h-[600px]">
          {/* DSL pane — hidden below sm (mobile too cramped). Instant swap: text
              crossfades read as overlapping garble, so render only the active slide. */}
          <div
            className="relative hidden overflow-y-auto p-5 sm:block sm:border-r"
            style={{
              background: 'var(--fill-muted)',
              borderColor: 'var(--fill-muted)',
            }}
          >
            <pre className="font-mono text-[13px] leading-relaxed text-fd-foreground">
              <code>{slides[index]?.dsl}</code>
            </pre>
          </div>

          {/* Render pane — fills fixed height, diagram centered. Instant swap
              keeps the chrome label, DSL, and diagram visually in lockstep. */}
          <div className="dot-grid relative h-full">
            <div
              key={index}
              className="absolute inset-0 flex items-center justify-center p-6 [&_svg]:max-h-full [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: slides[index]?.svg ?? '' }}
            />
          </div>
        </div>
      </div>

      {/* Tab indicators — mono labels, accent underline on active */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-xs">
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
