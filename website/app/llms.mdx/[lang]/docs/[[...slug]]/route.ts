import { buildDocLocaleMap, docFileKey } from '@/lib/docs-locales';
import { DOC_LOCALES } from '@/lib/i18n/locales';
import { getLlmDocText, LLM_CACHE_HEADERS, SITE_URL } from '@/lib/llm-docs';
import { source } from '@/lib/source';

export const revalidate = false;

const localeMap = buildDocLocaleMap();

export function generateStaticParams() {
  return DOC_LOCALES.filter((locale) => locale !== 'en').flatMap((lang) =>
    source.getPages(lang)
      .filter((page) => localeMap[docFileKey(page.slugs)]?.includes(lang))
      .map((page) => ({ lang, slug: page.slugs })),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string; slug?: string[] }> },
) {
  const { lang, slug = [] } = await params;
  if (!(DOC_LOCALES as readonly string[]).includes(lang) || lang === 'en') {
    return new Response('Documentation locale not found.\n', { status: 404 });
  }
  if (!localeMap[docFileKey(slug)]?.includes(lang)) {
    return new Response('Documentation translation not found.\n', { status: 404 });
  }
  const page = source.getPage(slug, lang);
  if (!page) return new Response('Documentation page not found.\n', { status: 404 });

  const canonicalPath = slug.length ? `/${lang}/docs/${slug.join('/')}` : `/${lang}/docs`;
  return new Response(await getLlmDocText(page, lang), {
    headers: {
      ...LLM_CACHE_HEADERS,
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${SITE_URL}${canonicalPath}>; rel="canonical"`,
    },
  });
}
