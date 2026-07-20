import { docBarePath } from '@/lib/docs-locales';
import { localizedUrl } from '@/lib/i18n/locales';

export const SITE_URL = 'https://schematex.js.org';
const PLAYGROUND_MARKER = '<!-- SCHEMATEX_PLAYGROUND -->';

export interface LlmDocPage {
  slugs: string[];
  data: {
    title: string;
    description?: string;
    getText: (type: 'raw' | 'processed') => Promise<string>;
  };
}

export function docMarkdownPath(slugs: string[], locale = 'en'): string {
  const path = `${docBarePath(slugs)}.md`;
  return locale === 'en' ? path : `/${locale}${path}`;
}

function decodeNumericEntities(value: string): string {
  return value.replace(/&#(?:x([\da-f]+)|(\d+));/gi, (entity, hex: string, decimal: string) => {
    const codePoint = Number.parseInt(hex ?? decimal, hex ? 16 : 10);
    if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
      return entity;
    }
    return String.fromCodePoint(codePoint);
  });
}

function restorePlaygroundExamples(processed: string, raw: string): string {
  const examples = [...raw.matchAll(/<Playground\s+initial=\{`([\s\S]*?)`\}[\s\S]*?\/>/g)]
    .map((match) => match[1].trim());
  let index = 0;
  return processed.replaceAll(PLAYGROUND_MARKER, () => {
    const dsl = examples[index++];
    return dsl
      ? `\`\`\`schematex\n${dsl}\n\`\`\``
      : '[Open this example in the Playground](https://schematex.js.org/playground)';
  });
}

/** Convert one compiled MDX page into standalone Markdown with discovery links. */
export async function getLlmDocText(page: LlmDocPage, locale = 'en'): Promise<string> {
  const barePath = docBarePath(page.slugs);
  const canonicalUrl = localizedUrl(SITE_URL, locale, barePath);
  const markdownUrl = `${SITE_URL}${docMarkdownPath(page.slugs, locale)}`;
  const [processed, raw] = await Promise.all([
    page.data.getText('processed'),
    page.data.getText('raw'),
  ]);
  const content = decodeNumericEntities(restorePlaygroundExamples(processed, raw).trim());

  return [
    `# ${page.data.title}`,
    page.data.description ? `> ${page.data.description}` : null,
    `Canonical URL: ${canonicalUrl}`,
    `Markdown URL: ${markdownUrl}`,
    content,
  ].filter((section): section is string => section !== null).join('\n\n');
}

export const LLM_CACHE_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
  'X-Content-Type-Options': 'nosniff',
} as const;
