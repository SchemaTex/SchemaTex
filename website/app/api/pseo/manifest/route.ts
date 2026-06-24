import { source, DOC_LOCALES } from '@/lib/source';
import { LIVE_LOCALES } from '@/lib/i18n/locales';
import { allExamples } from '@/lib/examples-source';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Scan content/docs for *.{locale}.mdx files to know which locales have actual
// translations (not just fumadocs i18n fallbacks). Returns { slug: locale[] }.
// e.g. { 'getting-started': ['en','zh-Hans','ja',...], 'genogram': ['en'] }
function buildDocLocaleMap(): Record<string, string[]> {
  const contentDir = path.join(process.cwd(), 'content/docs');
  const localeSet = new Set<string>(DOC_LOCALES);
  const map: Record<string, string[]> = {};

  for (const file of fs.readdirSync(contentDir)) {
    if (!file.endsWith('.mdx')) continue;
    const name = file.slice(0, -4);
    const parts = name.split('.');
    const lastPart = parts[parts.length - 1];

    const [slug, locale] =
      localeSet.has(lastPart) && lastPart !== 'en'
        ? [parts.slice(0, -1).join('.'), lastPart]
        : [name, 'en'];

    if (!map[slug]) map[slug] = [];
    map[slug].push(locale);
  }
  return map;
}

export function GET(request: Request) {
  const token = request.headers.get('x-pseo-auth');
  if (!token || token !== process.env.PSEO_AUTH_TOKEN) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const NOW = new Date().toISOString();
  const localeMap = buildDocLocaleMap();

  // English pages define the canonical slug set; per-page locale coverage comes
  // from localeMap (actual translation files, not fumadocs fallbacks).
  const enPages = source.getPages('en');
  const docSlugs = enPages.flatMap((page) => {
    // page.url = '/docs/getting-started'. Use the full path as slug (no locale prefix).
    const slug = page.url;
    // Filename key: last segment of the URL path ('getting-started', 'index', …)
    const fileKey = page.slugs.join('/') || 'index';
    const locales = localeMap[fileKey] ?? ['en'];

    return locales.map((locale) => ({
      slug,
      locale,
      status: 'live' as const,
      kind: 'page' as const,
      updatedAt: NOW,
    }));
  });

  const manifest = {
    product: 'schematex',
    fetchedAt: NOW,
    locales: {
      // Homepage is translated into all 17 LIVE_LOCALES; docs cover 9 DOC_LOCALES.
      // Report the full set so cockpit "Add Keywords" modal can offer all options.
      supported: [...LIVE_LOCALES],
      default: 'en',
    },
    types: [
      {
        id: 'home',
        name: 'Home',
        urlSegment: '',
        schemaJson: null,
        // One entry per live homepage locale.
        slugs: LIVE_LOCALES.map((locale) => ({
          slug: '/',
          locale,
          status: 'live' as const,
          kind: 'page' as const,
          updatedAt: NOW,
        })),
      },
      {
        id: 'doc',
        name: 'Documentation',
        urlSegment: 'docs',
        schemaJson: null,
        slugs: docSlugs,
      },
      {
        id: 'example',
        name: 'Examples',
        urlSegment: 'examples',
        schemaJson: null,
        slugs: allExamples.map((ex) => ({
          slug: `/examples/${ex.slug}`,
          locale: 'en',
          status: 'live' as const,
          kind: 'page' as const,
          updatedAt: NOW,
        })),
      },
    ],
  };

  // private, no-store: cockpit's revalidateTag only clears Data Cache, not CDN.
  // Without this, CDN can serve stale manifest for 5 min after a write.
  return Response.json(manifest, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
