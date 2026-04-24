import { existsSync, writeFileSync } from 'node:fs';
import { NOTO_SANS_BASE64 } from '../(home)/examples/[slug]/_assets/noto-sans-base64';

export const runtime = 'nodejs';

const TMP_FONT_PATH = '/tmp/schematex-noto-sans-regular.ttf';

function ensureFont(): string {
  if (existsSync(TMP_FONT_PATH)) return TMP_FONT_PATH;
  writeFileSync(TMP_FONT_PATH, Buffer.from(NOTO_SANS_BASE64, 'base64'));
  return TMP_FONT_PATH;
}

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Schematex documentation';

const W = size.width;
const H = size.height;

// Variant A: light theme
const C_BG = '#ffffff';
const C_TEXT = '#0f172a';
const C_TEXT_MUTED = '#475569';
const C_NEUTRAL = '#94a3b8';
const C_ACCENT = '#2563eb';
const C_FILL_MUTED = '#f1f5f9';
const C_BORDER = '#e2e8f0';

const LEFT_W = 500;
const PAD = 52;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(s: string, maxPerLine: number): string {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > maxPerLine && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}

function logoMark(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s / 24})">
  <path d="M 5 3 H 2.5 V 21 H 5" fill="none" stroke="${C_TEXT}" stroke-width="2.2" stroke-linejoin="miter" stroke-linecap="square"/>
  <path d="M 19 3 H 21.5 V 21 H 19" fill="none" stroke="${C_TEXT}" stroke-width="2.2" stroke-linejoin="miter" stroke-linecap="square"/>
  <path d="M 16 7 C 16 12, 8 12, 8 17" fill="none" stroke="${C_ACCENT}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="16" cy="7" r="2.2" fill="${C_TEXT}"/>
  <circle cx="8" cy="17" r="2.2" fill="${C_TEXT}"/>
</g>`;
}

function dotGrid(x: number, y: number, w: number, h: number): string {
  const step = 16;
  const r = 1;
  const dots: string[] = [];
  for (let dy = step; dy < h; dy += step) {
    for (let dx = step; dx < w; dx += step) {
      dots.push(`<circle cx="${x + dx}" cy="${y + dy}" r="${r}" fill="${C_FILL_MUTED}"/>`);
    }
  }
  return dots.join('\n');
}

function decorativeGraph(rightX: number): string {
  const nodes: [number, number][] = [
    [rightX + 160, 140], [rightX + 340, 200], [rightX + 520, 140],
    [rightX + 250, 340], [rightX + 450, 400], [rightX + 160, 480],
    [rightX + 580, 320],
  ];
  const edges: [number, number][] = [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [2, 6], [4, 6]];
  const parts: string[] = [];
  for (const [a, b] of edges) {
    parts.push(
      `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="${C_NEUTRAL}" stroke-width="2" opacity="0.5"/>`,
    );
  }
  for (const [x, y] of nodes) {
    parts.push(`<circle cx="${x}" cy="${y}" r="18" fill="${C_ACCENT}" opacity="0.18"/>`);
    parts.push(`<circle cx="${x}" cy="${y}" r="18" fill="none" stroke="${C_ACCENT}" stroke-width="2" opacity="0.35"/>`);
  }
  return parts.join('\n');
}

export default async function Image() {
  const description =
    'Text DSL to SVG — 20+ diagram families for medicine, engineering, and analysis. Free, open source, made for AI.';

  const titleLines = ['Documentation'];
  const descLines = wrapText(description, 42).split('\n').slice(0, 4);

  const rightX = LEFT_W;
  const rightW = W - rightX;

  const titleY = 216;
  const descStartY = titleY + 56 + 26;

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${titleY + i * 56}" font-family="sans-serif" font-size="48" font-weight="700" fill="${C_TEXT}" letter-spacing="-1.3">${esc(line)}</text>`,
    )
    .join('\n');

  const descSvg = descLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${descStartY + i * 26}" font-family="sans-serif" font-size="17" fill="${C_TEXT_MUTED}">${esc(line)}</text>`,
    )
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C_BG}"/>
<rect x="0" y="0" width="${LEFT_W}" height="${H}" fill="${C_FILL_MUTED}"/>
<rect x="${rightX}" y="0" width="${rightW}" height="${H}" fill="${C_BG}"/>
${dotGrid(rightX, 0, rightW, H)}
${decorativeGraph(rightX)}
<rect x="${LEFT_W}" y="0" width="1" height="${H}" fill="${C_BORDER}"/>
${logoMark(PAD, 52, 28)}
<text x="${PAD + 40}" y="74" font-family="sans-serif" font-size="22" font-weight="700" fill="${C_TEXT}" letter-spacing="-0.5">${esc('Schematex')}</text>
<text x="${PAD}" y="128" font-family="sans-serif" font-size="12" font-weight="700" fill="${C_ACCENT}" letter-spacing="2.5">${esc('DOCS')}</text>
${titleSvg}
${descSvg}
<text x="${PAD}" y="${H - 32}" font-family="sans-serif" font-size="13" fill="${C_NEUTRAL}">${esc('schematex.js.org')}</text>
</svg>`;

  const fontPath = ensureFont();
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: {
      loadSystemFonts: false,
      fontFiles: [fontPath],
      defaultFontFamily: 'Noto Sans',
      sansSerifFamily: 'Noto Sans',
      serifFamily: 'Noto Sans',
    },
  });
  const png = resvg.render().asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
