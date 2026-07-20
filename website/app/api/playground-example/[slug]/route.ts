import { getExampleBySlug } from 'schematex/ai';

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const example = getExampleBySlug(slug);
  if (!example) return new Response('Example not found', { status: 404 });

  return new Response(example.dsl, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
