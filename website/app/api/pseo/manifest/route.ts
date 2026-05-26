import { source } from '@/lib/source';
import { allExamples } from '@/lib/examples-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOW = new Date().toISOString();

export function GET(request: Request) {
  const token = request.headers.get('x-pseo-auth');
  if (!token || token !== process.env.PSEO_AUTH_TOKEN) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const manifest = {
    product: 'schematex',
    fetchedAt: new Date().toISOString(),
    locales: { supported: ['en'], default: 'en' },
    types: [
      {
        id: 'home',
        name: 'Home',
        urlSegment: '',
        schemaJson: null,
        slugs: [
          { slug: '/', locale: 'en', status: 'live' as const, kind: 'page' as const, updatedAt: NOW },
        ],
      },
      {
        id: 'doc',
        name: 'Documentation',
        urlSegment: 'docs',
        schemaJson: null,
        slugs: source.getPages().map((page) => ({
          slug: page.slugs.join('/') || 'index',
          locale: 'en',
          status: 'live' as const,
          kind: 'page' as const,
          updatedAt: NOW,
        })),
      },
      {
        id: 'example',
        name: 'Examples',
        urlSegment: 'examples',
        schemaJson: null,
        slugs: allExamples.map((ex) => ({
          slug: ex.slug,
          locale: 'en',
          status: 'live' as const,
          kind: 'page' as const,
          updatedAt: NOW,
        })),
      },
    ],
  };

  return Response.json(manifest);
}
