import { getLlmDocText, LLM_CACHE_HEADERS, SITE_URL } from '@/lib/llm-docs';
import { source } from '@/lib/source';

export const revalidate = false;

export function generateStaticParams() {
  return source.getPages('en').map((page) => ({ slug: page.slugs }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await params;
  const page = source.getPage(slug, 'en');
  if (!page) return new Response('Documentation page not found.\n', { status: 404 });

  const canonicalPath = slug.length ? `/docs/${slug.join('/')}` : '/docs';
  return new Response(await getLlmDocText(page), {
    headers: {
      ...LLM_CACHE_HEADERS,
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${SITE_URL}${canonicalPath}>; rel="canonical"`,
    },
  });
}
