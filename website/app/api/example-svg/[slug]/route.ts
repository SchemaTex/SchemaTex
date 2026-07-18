import { allExamples } from '@/lib/examples-source';
import { render } from 'schematex';

const examplesBySlug = new Map(allExamples.map((example) => [example.slug, example]));

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const example = examplesBySlug.get(slug);
  if (!example) return new Response('Example not found', { status: 404 });

  const theme = new URL(request.url).searchParams.get('theme') === 'dark' ? 'dark' : 'default';
  try {
    return new Response(render(example.dsl, { theme }), {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response('Unable to render example', { status: 422 });
  }
}
