import { existsSync, writeFileSync } from 'node:fs';
import { render } from 'schematex';
import { NOTO_SANS_BASE64 } from '../../../(home)/examples/[slug]/_assets/noto-sans-base64';
import { getDocOGEntry } from '@/lib/docs-og-registry';
import { examplesByDiagram } from '@/lib/examples-source';

export const runtime = 'nodejs';

const TMP_FONT_PATH = '/tmp/schematex-noto-sans-regular.ttf';

function ensureFont(): string {
  if (existsSync(TMP_FONT_PATH)) return TMP_FONT_PATH;
  writeFileSync(TMP_FONT_PATH, Buffer.from(NOTO_SANS_BASE64, 'base64'));
  return TMP_FONT_PATH;
}

const W = 1200;
const H = 630;

// Variant A: light theme (design-system.html .og-card default)
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

// Subtle dot grid used in design-system Variant A right panel
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

function parseSvgDims(svg: string) {
  const wMatch = /\bwidth="([\d.]+)"/.exec(svg);
  const hMatch = /\bheight="([\d.]+)"/.exec(svg);
  const vbMatch = /viewBox="([^"]+)"/.exec(svg);
  const w = wMatch ? parseFloat(wMatch[1]) : 800;
  const h = hMatch ? parseFloat(hMatch[1]) : 600;
  const viewBox = vbMatch ? vbMatch[1] : `0 0 ${w} ${h}`;
  return { w, h, viewBox };
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

function resolveHeroDsl(slug: string, heroDsl?: string): string | null {
  if (heroDsl) return heroDsl;
  const examples = examplesByDiagram[slug];
  if (!examples || examples.length === 0) return null;
  const featured = examples.find((e) => e.featured);
  return (featured ?? examples[0]).dsl;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const entry = getDocOGEntry(slug);

  const title = entry?.title ?? 'Documentation';
  const badge = entry?.badge ?? 'DOCS';
  const standard = entry?.standard ??
    'Text DSL to SVG — 20+ diagram families for medicine, engineering, and analysis.';

  let diagramSvg: { body: string; viewBox: string } | null = null;
  if (entry) {
    const dsl = resolveHeroDsl(slug, entry.heroDsl);
    if (dsl) {
      try {
        const svg = render(dsl);
        const { viewBox } = parseSvgDims(svg);
        const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
        diagramSvg = { body, viewBox };
      } catch {
        diagramSvg = null;
      }
    }
  }

  const titleLines = wrapText(title, 18).split('\n').slice(0, 2);
  const titleStartY = 216;
  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${titleStartY + i * 54}" font-family="sans-serif" font-size="46" font-weight="700" fill="${C_TEXT}" letter-spacing="-1.2">${esc(line)}</text>`,
    )
    .join('\n');

  const standardStartY = titleStartY + titleLines.length * 54 + 26;
  const standardLines = wrapText(standard, 42).split('\n').slice(0, 4);
  const standardSvg = standardLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${standardStartY + i * 26}" font-family="sans-serif" font-size="17" fill="${C_TEXT_MUTED}">${esc(line)}</text>`,
    )
    .join('\n');

  const rightX = LEFT_W;
  const rightW = W - rightX;

  // Right panel: diagram sits directly on white background with subtle dot grid behind it
  let rightContent: string;
  if (diagramSvg) {
    const innerPad = 52;
    const diagX = rightX + innerPad;
    const diagY = 56;
    const diagW = rightW - innerPad * 2;
    const diagH = H - diagY - 56;
    rightContent = `${dotGrid(rightX, 0, rightW, H)}
<svg x="${diagX}" y="${diagY}" width="${diagW}" height="${diagH}" viewBox="${diagramSvg.viewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${diagramSvg.body}</svg>`;
  } else {
    rightContent = `${dotGrid(rightX, 0, rightW, H)}
${decorativeGraph(rightX)}`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C_BG}"/>
<!-- Left panel (muted fill) -->
<rect x="0" y="0" width="${LEFT_W}" height="${H}" fill="${C_FILL_MUTED}"/>
<!-- Right panel (pure white) -->
<rect x="${rightX}" y="0" width="${rightW}" height="${H}" fill="${C_BG}"/>
${rightContent}
<!-- Divider line -->
<rect x="${LEFT_W}" y="0" width="1" height="${H}" fill="${C_BORDER}"/>
<!-- Logo + wordmark -->
${logoMark(PAD, 52, 28)}
<text x="${PAD + 40}" y="74" font-family="sans-serif" font-size="22" font-weight="700" fill="${C_TEXT}" letter-spacing="-0.5">${esc('Schematex')}</text>
<!-- Accent badge -->
<text x="${PAD}" y="128" font-family="sans-serif" font-size="12" font-weight="700" fill="${C_ACCENT}" letter-spacing="2.5">${esc(badge)}</text>
<!-- Title -->
${titleSvg}
<!-- Standard / description -->
${standardSvg}
<!-- Footer -->
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
