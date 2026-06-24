import fs from 'fs';
import path from 'path';
import { DOC_LOCALES } from '@/lib/i18n/locales';

/**
 * Scan content/docs for `*.{locale}.mdx` files to know which locales have a real
 * translation (not just a fumadocs i18n fallback to English). Returns a map from
 * the page's file key to the locales present.
 *
 * The key is the mdx filename without its extension/locale suffix, which equals
 * fumadocs' `page.slugs.join('/')` (or 'index' for the docs root) — so callers
 * can look up a page's translated locales by that key.
 *
 *   { 'getting-started': ['en','zh-Hans','ja',…], 'genogram': ['en'], 'index': ['en',…] }
 *
 * Shared by the pSEO manifest route and the sitemap so the two never drift.
 */
export function buildDocLocaleMap(): Record<string, string[]> {
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

/** The bare (locale-agnostic) canonical path for a docs page given its fumadocs
 *  `page.slugs`. English is served here; non-default locales get a `/<locale>`
 *  prefix applied by the caller. NEVER derive this from `page.url` — fumadocs
 *  i18n prefixes the default locale too, yielding '/en/docs/api' which 404s. */
export function docBarePath(slugs: string[]): string {
  return slugs.length ? `/docs/${slugs.join('/')}` : '/docs';
}

/** The file-key used by buildDocLocaleMap for a page with these slugs. */
export function docFileKey(slugs: string[]): string {
  return slugs.join('/') || 'index';
}
