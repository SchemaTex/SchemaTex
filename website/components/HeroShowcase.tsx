'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SchematexRenderResult } from 'schematex';
import { InteractiveSchematexDiagram } from 'schematex/react';
import { DiagramFrame } from './DiagramFrame';

export interface HeroSlide {
  label: string;
  standard: string;
  dsl: string;
}

interface HeroShowcaseProps {
  slides: HeroSlide[];
  intervalMs?: number;
}

export function HeroShowcase({ slides, intervalMs = 6500 }: HeroShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(slides.map((slide) => [slide.label, slide.dsl])),
  );
  const [renderResult, setRenderResult] = useState<SchematexRenderResult | null>(null);

  useEffect(() => {
    setDrafts((current) => ({
      ...Object.fromEntries(slides.map((slide) => [slide.label, slide.dsl])),
      ...current,
    }));
  }, [slides]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, paused, slides.length]);

  const slide = slides[index];
  const dsl = slide ? drafts[slide.label] ?? slide.dsl : '';
  const lineCount = useMemo(() => dsl.split('\n').length, [dsl]);
  const svgBytes = renderResult ? new TextEncoder().encode(renderResult.svg).length : 0;
  const svgSize = svgBytes < 1024 ? `${svgBytes} B` : `${(svgBytes / 1024).toFixed(1)} KB`;

  const updateDraft = useCallback((next: string) => {
    if (!slide) return;
    setPaused(true);
    setDrafts((current) => ({ ...current, [slide.label]: next }));
  }, [slide]);

  if (!slide) return null;

  const actions = (
    <span className="pg-mini" aria-hidden style={{ cursor: 'default' }}>
      edit source or canvas
    </span>
  );

  const footer = (
    <div className="flex shrink-0 items-center justify-between border-t border-[color:var(--fill-muted)] bg-white px-3 py-2 font-mono text-[11px] text-[color:var(--text-muted)]">
      <span>UTF-8 · LF · {lineCount} lines · {dsl.length} chars</span>
      <span>
        <span style={{ color: renderResult?.ok ? 'var(--positive)' : 'var(--negative)' }}>
          {renderResult?.ok ? '✓ editable' : '✗ check source'}
        </span>
        <span className="mx-1.5 opacity-40">·</span>
        {svgSize} SVG
      </span>
    </div>
  );

  return (
    <div className="relative" onPointerDown={() => setPaused(true)}>
      <DiagramFrame
        diagram={slide.label}
        standard={slide.standard}
        actions={actions}
        footer={footer}
      >
        <div className="grid h-[360px] grid-cols-1 sm:h-[500px] sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:h-[600px]">
          <label className="relative hidden min-h-0 flex-col border-r border-[color:var(--fill-muted)] bg-[color:var(--fill-muted)] sm:flex">
            <span className="border-b border-[color:var(--fill-muted)] bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
              DSL source
            </span>
            <textarea
              value={dsl}
              onChange={(event) => updateDraft(event.currentTarget.value)}
              onFocus={() => setPaused(true)}
              spellCheck={false}
              aria-label={`${slide.label} DSL source`}
              className="min-h-0 flex-1 resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed text-[color:var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--accent)]"
            />
          </label>

          <div className="dot-grid relative min-h-0 bg-white p-6">
            <InteractiveSchematexDiagram
              value={dsl}
              onChange={updateDraft}
              onRender={setRenderResult}
              debounceMs={100}
              ariaLabel={`${slide.label} interactive diagram`}
              className="flex h-full w-full items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
              canvasClassName="flex h-full w-full items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full"
            />
            <div className="sx-canvas-caption" aria-hidden>
              double-click text · drag supported geometry
            </div>
          </div>
        </div>
      </DiagramFrame>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-xs">
        {slides.map((candidate, candidateIndex) => (
          <button
            key={candidate.label}
            type="button"
            onClick={() => {
              setIndex(candidateIndex);
              setPaused(true);
            }}
            aria-label={`Edit ${candidate.label}`}
            aria-pressed={candidateIndex === index}
            className="relative py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
            style={{ color: candidateIndex === index ? 'var(--text)' : 'var(--text-muted)' }}
          >
            {candidate.label}
            {candidateIndex === index && (
              <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-[2px] bg-[color:var(--accent)]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
