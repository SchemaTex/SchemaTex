import { source } from '@/lib/source';
import { LIVE_LOCALES } from '@/lib/i18n/locales';
import { buildDocLocaleMap, docFileKey } from '@/lib/docs-locales';
import { allExamples } from '@/lib/examples-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    // English page URLs are locale-agnostic base slugs. The cockpit prepends
    // non-default locales itself (for example, '/fr/docs/api').
    const slug = page.url;
    const locales = localeMap[docFileKey(page.slugs)] ?? ['en'];

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
