import { existsSync, writeFileSync } from 'node:fs';
import { render } from 'schematex';
import { NOTO_SANS_BASE64 } from '../../(home)/examples/[slug]/_assets/noto-sans-base64';
import { getExample } from '@/lib/examples-source';

export const runtime = 'nodejs';

// Bare diagram render → PNG. No card chrome, just the diagram on white.
// Usage:
//   /og/render?d=<base64url(dsl)>   render arbitrary DSL
//   /og/render?s=<example-slug>     render a known example's DSL
//   optional &w=<px> to override output width (capped)

const TMP_FONT_PATH = '/tmp/schematex-noto-sans-regular.ttf';

function ensureFont(): string {
  if (existsSync(TMP_FONT_PATH)) return TMP_FONT_PATH;
  writeFileSync(TMP_FONT_PATH, Buffer.from(NOTO_SANS_BASE64, 'base64'));
  return TMP_FONT_PATH;
}

function decodeDsl(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
}

const MAX_DSL = 8000;
const MAX_W = 2400;
const DEFAULT_SCALE = 2;

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const d = url.searchParams.get('d');
  const s = url.searchParams.get('s');

  let dsl: string | null = null;
  if (d) {
    try {
      dsl = decodeDsl(d);
    } catch {
      return new Response('bad d param', { status: 400 });
    }
  } else if (s) {
    dsl = getExample(s)?.dsl ?? null;
    if (!dsl) return new Response('unknown example slug', { status: 404 });
  }

  if (!dsl) return new Response('missing d or s param', { status: 400 });
  if (dsl.length > MAX_DSL) return new Response('dsl too large', { status: 413 });

  let svg: string;
  try {
    svg = render(dsl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'render error';
    return new Response(`render error: ${msg}`, { status: 422 });
  }

  // Intrinsic width drives the output resolution; white background behind the diagram.
  const intrinsicW = Number((svg.match(/width="(\d+(?:\.\d+)?)"/) || [])[1] || 800);
  const wParam = Number(url.searchParams.get('w'));
  const targetW = Math.min(
    MAX_W,
    Number.isFinite(wParam) && wParam > 0 ? wParam : Math.round(intrinsicW * DEFAULT_SCALE),
  );
  const withBg = svg.replace(
    /(<svg[^>]*>)/,
    '$1<rect x="-9999" y="-9999" width="99999" height="99999" fill="#ffffff"/>',
  );

  const fontPath = ensureFont();
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(withBg, {
    fitTo: { mode: 'width', value: targetW },
    background: '#ffffff',
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
