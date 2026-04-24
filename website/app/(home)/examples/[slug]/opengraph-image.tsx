import { existsSync, writeFileSync } from 'node:fs';
import { render } from 'schematex';
import { notFound } from 'next/navigation';
import { getExample } from '@/lib/examples-source';
import { NOTO_SANS_BASE64 } from './_assets/noto-sans-base64';

export const runtime = 'nodejs';

const TMP_FONT_PATH = '/tmp/schematex-noto-sans-regular.ttf';

function ensureFont(): string {
  if (existsSync(TMP_FONT_PATH)) return TMP_FONT_PATH;
  writeFileSync(TMP_FONT_PATH, Buffer.from(NOTO_SANS_BASE64, 'base64'));
  return TMP_FONT_PATH;
}

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Schematex diagram example';

const W = size.width;
const H = size.height;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ex = getExample(slug);
  if (!ex) notFound();

  const innerSvg = render(ex.dsl);
  const { viewBox } = parseSvgDims(innerSvg);
  const innerBody = innerSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const badgeParts = [ex.diagram, ex.standard].filter(Boolean) as string[];
  const badge = esc(badgeParts.join('  ·  ').toUpperCase());
  const persona = truncate(ex.persona ?? ex.industry.join(', '), 90);

  const description = ex.description ?? '';

  // Design-system tokens (default theme, from docs/DESIGN-SYSTEM.md §3.2)
  const C_TEXT = '#0f172a';
  const C_TEXT_MUTED = '#475569';
  const C_NEUTRAL = '#94a3b8';
  const C_ACCENT = '#2563eb';
  const C_FILL_MUTED = '#f1f5f9';

  // Logo mark (brackets + S-curve) — scaled from favicon.svg 24x24 viewBox
  const logoMark = (x: number, y: number, s: number) => `
<g transform="translate(${x} ${y}) scale(${s / 24})">
  <path d="M 5 3 H 2.5 V 21 H 5" fill="none" stroke="${C_TEXT}" stroke-width="2.2" stroke-linejoin="miter" stroke-linecap="square"/>
  <path d="M 19 3 H 21.5 V 21 H 19" fill="none" stroke="${C_TEXT}" stroke-width="2.2" stroke-linejoin="miter" stroke-linecap="square"/>
  <path d="M 16 7 C 16 12, 8 12, 8 17" fill="none" stroke="${C_ACCENT}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="16" cy="7" r="2.2" fill="${C_TEXT}"/>
  <circle cx="8" cy="17" r="2.2" fill="${C_TEXT}"/>
</g>`;

  const LEFT_W = 440;
  const PAD = 48;
  const diagX = LEFT_W;
  const diagY = 24;
  const diagW = W - LEFT_W - PAD;
  const diagH = H - 24 - 64;
  const titleLines = wrapTitle(ex.title, 18).split('\n').slice(0, 3);
  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${182 + i * 48}" font-family="sans-serif" font-size="40" font-weight="600" fill="${C_TEXT}" letter-spacing="-0.8">${esc(line)}</text>`,
    )
    .join('\n');
  const descStartY = 182 + titleLines.length * 48 + 28;
  const descLines = description
    ? wrapText(description, 42).split('\n').slice(0, 5)
    : [];
  const descSvg = descLines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${descStartY + i * 24}" font-family="sans-serif" font-size="16" fill="${C_TEXT_MUTED}">${esc(line)}</text>`,
    )
    .join('\n');
  const layout = `
<rect x="0" y="0" width="${LEFT_W}" height="${H}" fill="${C_FILL_MUTED}"/>
<rect x="${LEFT_W}" y="0" width="2" height="${H}" fill="${C_NEUTRAL}" opacity="0.5"/>
${logoMark(PAD, 52, 28)}
<text x="${PAD + 40}" y="74" font-family="sans-serif" font-size="22" font-weight="600" fill="${C_TEXT}" letter-spacing="-0.4">Schematex</text>
<text x="${PAD}" y="122" font-family="sans-serif" font-size="11" fill="${C_ACCENT}" font-weight="600" letter-spacing="2">${badge}</text>
${titleSvg}
${descSvg}
<text x="${PAD}" y="${H - 60}" font-family="sans-serif" font-size="14" fill="${C_TEXT_MUTED}">${esc(persona)}</text>
<text x="${PAD}" y="${H - 32}" font-family="sans-serif" font-size="13" fill="${C_NEUTRAL}">schematex.js.org</text>
<svg x="${diagX + 24}" y="${diagY}" width="${diagW - 24}" height="${diagH}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${innerBody}</svg>`;

  const wrapper = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="100%" height="100%" fill="#ffffff"/>
${layout}
</svg>`;

  const fontPath = ensureFont();
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(wrapper, {
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

function parseSvgDims(svg: string) {
  const wMatch = /\bwidth="([\d.]+)"/.exec(svg);
  const hMatch = /\bheight="([\d.]+)"/.exec(svg);
  const vbMatch = /viewBox="([^"]+)"/.exec(svg);
  const w = wMatch ? parseFloat(wMatch[1]) : 800;
  const h = hMatch ? parseFloat(hMatch[1]) : 600;
  const viewBox = vbMatch ? vbMatch[1] : `0 0 ${w} ${h}`;
  return { w, h, viewBox };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
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

function wrapTitle(s: string, maxPerLine: number): string {
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
  return lines.slice(0, 3).join('\n');
}

function renderWrappedText(
  text: string,
  x: number,
  yStart: number,
  size: number,
  lineHeight: number,
  weight: string,
  fill: string,
): string {
  const lines = text.split('\n');
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${yStart + i * lineHeight}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" letter-spacing="-0.3">${line}</text>`,
    )
    .join('\n');
}
