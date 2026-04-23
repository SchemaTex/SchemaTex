import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { render } from 'schematex';
import { notFound } from 'next/navigation';
import { getExample } from '@/lib/examples-source';

export const runtime = 'nodejs';

const TMP_FONT_PATH = '/tmp/schematex-noto-sans-regular.ttf';

function ensureFont(): string {
  if (existsSync(TMP_FONT_PATH)) return TMP_FONT_PATH;
  // Passing a URL (not fileURLToPath'd string) avoids a cross-realm
  // URL-instance type check that fails inside the Next.js bundle.
  const fontUrl = new URL('./_assets/noto-sans-regular.ttf', import.meta.url);
  const buf = readFileSync(fontUrl);
  writeFileSync(TMP_FONT_PATH, buf);
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
  const { w, h, viewBox } = parseSvgDims(innerSvg);
  const innerBody = innerSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

  const PAD_X = 72;
  const TOP = 152;
  const BOTTOM = 76;
  const areaW = W - PAD_X * 2;
  const areaH = H - TOP - BOTTOM;
  const scale = Math.min(areaW / w, areaH / h, 2.2);
  const scaledW = w * scale;
  const scaledH = h * scale;
  const dx = PAD_X + (areaW - scaledW) / 2;
  const dy = TOP + (areaH - scaledH) / 2;

  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const badgeParts = [ex.diagram, ex.standard].filter(Boolean) as string[];
  const badge = esc(badgeParts.join('  ·  ').toUpperCase());
  const title = esc(truncate(ex.title, 64));
  const persona = esc(truncate(ex.persona ?? ex.industry.join(', '), 90));

  const wrapper = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffffff"/>
    <stop offset="100%" stop-color="#f8fafc"/>
  </linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<rect x="0" y="0" width="${W}" height="6" fill="#2563eb"/>
<text x="${PAD_X}" y="60" font-family="sans-serif" font-size="22" font-weight="700" fill="#0f172a" letter-spacing="-0.3">Schematex</text>
<text x="${PAD_X}" y="88" font-family="sans-serif" font-size="12" fill="#2563eb" letter-spacing="2">${badge}</text>
<text x="${PAD_X}" y="128" font-family="sans-serif" font-size="28" font-weight="700" fill="#0f172a">${title}</text>
<g transform="translate(${dx} ${dy}) scale(${scale})">
<svg width="${w}" height="${h}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${innerBody}</svg>
</g>
<text x="${PAD_X}" y="${H - 40}" font-family="sans-serif" font-size="15" fill="#475569">${persona}</text>
<text x="${W - PAD_X}" y="${H - 40}" font-family="sans-serif" font-size="15" fill="#64748b" text-anchor="end">schematex.js.org</text>
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
