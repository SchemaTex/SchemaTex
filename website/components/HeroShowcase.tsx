'use client';

import { useEffect, useState } from 'react';
import { DiagramFrame } from './DiagramFrame';

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

// ─── DSL tokenizer — ported from docs/design/preview/page-playground.jsx ──
// Token types follow the design system's 4 semantic classes:
//   kw  → var(--accent) fw500      — keywords
//   str → var(--positive)          — "quoted strings"
//   num → var(--warn)              — numbers / years
//   op  → var(--text-muted)        — operators, punctuation, brackets
//   ''  → plain (no style)

type TokenType = 'kw' | 'str' | 'num' | 'op' | '';

interface Token { text: string; type: TokenType }

const KW = new Set([
  'genogram','ecomap','pedigree','phylo','phylogenetic','sociogram',
  'timing','logic-gate','logic','circuit','ladder','sld','single-line',
  'block','entity-structure','entity','fishbone','ishikawa',
  'rung','parallel','category','household','affected','carrier','unaffected',
  'proband','deceased','index','male','female','type','jurisdiction','isolate',
  'XIC','XIO','OTL','OTU','OTE','AND','OR','XOR','NAND','NOR','NOT',
  'trust','corp','llc','fund','config','group',
]);

// Single regex that matches all token classes in priority order — matches
// the canonical tokenizer in the design system prototype.
const TOKEN_RE = /("[^"]*"|'[^']*')|(-?\d+(?:\.\d+)?%?|0x[\da-f]+)|([A-Za-z_][A-Za-z0-9_-]*)|(\/\/.*$)|([[\](){},:;=<>+\-*/|^&!?]+|-->|->|--)|(\s+)/g;

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let idx = 0;

  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m.index > idx) {
      tokens.push({ text: line.slice(idx, m.index), type: '' });
    }
    if (m[1])      tokens.push({ text: m[1], type: 'str' });
    else if (m[2]) tokens.push({ text: m[2], type: 'num' });
    else if (m[3]) tokens.push({ text: m[3], type: KW.has(m[3]) ? 'kw' : '' });
    else if (m[4]) tokens.push({ text: m[4], type: 'op' });   // // comment
    else if (m[5]) tokens.push({ text: m[5], type: 'op' });   // operators/punct
    else           tokens.push({ text: m[6] ?? '', type: '' }); // whitespace
    idx = TOKEN_RE.lastIndex;
  }
  if (idx < line.length) tokens.push({ text: line.slice(idx), type: '' });
  return tokens;
}

// Design-system token → inline style (CSS vars; work in light + dark).
const TOKEN_STYLE: Record<TokenType, React.CSSProperties> = {
  kw:  { color: 'var(--accent)', fontWeight: 500 },
  str: { color: 'var(--positive)' },
  num: { color: 'var(--warn)' },
  op:  { color: 'var(--text-muted)' },
  '': {},
};

function HighlightedDsl({ dsl }: { dsl: string }) {
  const lines = dsl.split('\n');
  const lineNumWidth = String(lines.length).length;

  return (
    <table
      aria-hidden
      className="w-full border-collapse font-mono text-[13px] leading-relaxed"
      style={{ tableLayout: 'fixed' }}
    >
      <tbody>
        {lines.map((line, idx) => (
          <tr key={idx}>
            <td
              className="select-none pr-4 text-right align-top"
              style={{
                width: `${lineNumWidth + 2}ch`,
                color: 'var(--text-muted)',
                opacity: 0.45,
                userSelect: 'none',
                paddingTop: 0,
                paddingBottom: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {idx + 1}
            </td>
            <td style={{ paddingTop: 0, paddingBottom: 0 }}>
              {tokenizeLine(line).map((tok, ti) => (
                <span key={ti} style={TOKEN_STYLE[tok.type]}>
                  {tok.text}
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ──────────────────────────────────────────────────────────────────────────

export function HeroShowcase({ slides, intervalMs = 6500 }: HeroShowcaseProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  const slide = slides[index];
  if (!slide) return null;

  const lineCount = slide.dsl.split('\n').length;
  const charCount = slide.dsl.length;
  const svgBytes = new TextEncoder().encode(slide.svg).length;
  const svgKb = svgBytes < 1024 ? `${svgBytes} B` : `${(svgBytes / 1024).toFixed(1)} KB`;

  const actions = (
    <span
      className="pg-mini"
      aria-hidden
      style={{ cursor: 'default', opacity: 0.7 }}
    >
      auto ↻
    </span>
  );

  const footer = (
    <div
      className="flex shrink-0 items-center justify-between px-3 py-2 font-mono text-[11px] text-fd-muted-foreground"
      style={{ background: 'var(--bg)', borderTop: '1px solid var(--fill-muted)' }}
    >
      <span>
        UTF-8 · LF · {lineCount} line{lineCount === 1 ? '' : 's'} · {charCount} chars
      </span>
      <span>
        <span style={{ color: 'var(--positive)' }}>✓ parsed</span>
        <span className="mx-1.5 opacity-40">·</span>
        {svgKb} SVG
      </span>
    </div>
  );

  return (
    <div className="relative">
      <DiagramFrame
        diagram={slide.label}
        standard={slide.standard}
        actions={actions}
        footer={footer}
      >
        <div className="grid h-[340px] grid-cols-1 sm:h-[500px] sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:h-[600px]">
          {/* DSL pane — highlighted, hidden on mobile */}
          <div
            className="relative hidden overflow-y-auto sm:block"
            style={{
              background: 'var(--fill-muted)',
              borderRight: '1px solid var(--fill-muted)',
            }}
          >
            <div className="p-4 pr-5">
              <HighlightedDsl dsl={slide.dsl} />
            </div>
          </div>

          {/* Render pane */}
          <div className="dot-grid relative h-full">
            <div
              key={index}
              className="absolute inset-0 flex items-center justify-center p-6 [&_svg]:max-h-full [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: slide.svg }}
            />
          </div>
        </div>
      </DiagramFrame>

      {/* Tab indicators */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-xs">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Show ${s.label}`}
            aria-pressed={i === index}
            className="relative py-1 transition"
            style={{
              color: i === index ? 'var(--text)' : 'var(--text-muted)',
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
