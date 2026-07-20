import { getLlmDocText, LLM_CACHE_HEADERS, SITE_URL } from '@/lib/llm-docs';
import { source } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const pages = source.getPages('en');
  const documents = await Promise.all(pages.map((page) => getLlmDocText(page)));
  const body = [
    '# Schematex complete documentation',
    '',
    `Canonical site: ${SITE_URL}`,
    'Documentation index: https://schematex.js.org/llms.txt',
    'Interactive capability JSON: https://schematex.js.org/api/interactive-capabilities',
    '',
    documents.join('\n\n---\n\n'),
    '',
  ].join('\n');

  return new Response(body, { headers: LLM_CACHE_HEADERS });
}
