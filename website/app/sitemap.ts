import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { allExamples } from '@/lib/examples-source';
import { LIVE_LOCALES, buildLanguageAlternates, localizedUrl } from '@/lib/i18n/locales';
import { buildDocLocaleMap, docBarePath, docFileKey } from '@/lib/docs-locales';

const SITE = 'https://schematex.js.org';
const NOW = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  // Homepage is translated — one entry per live locale, each carrying the full
  // hreflang alternate set. Other routes stay English-only for now.
  const homeAlternates = buildLanguageAlternates(SITE, '/');
  const homeRoutes: MetadataRoute.Sitemap = LIVE_LOCALES.map((locale) => ({
    url: localizedUrl(SITE, locale, '/'),
    priority: 1,
    lastModified: NOW,
    changeFrequency: 'weekly',
    alternates: { languages: homeAlternates },
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    ...homeRoutes,
    { url: `${SITE}/playground`, priority: 0.9, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/gallery`, priority: 0.8, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/examples`, priority: 0.7, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/changelog`, priority: 0.6, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/icons`, priority: 0.6, lastModified: NOW, changeFrequency: 'monthly' },
  ];
  // One sitemap entry per (doc page × translated locale). NOT page.url — fumadocs
  // i18n prefixes the default locale, so page.url is '/en/docs/api' (a 404). The
  // English doc is served bare at '/docs/api'; translated locales at '/<loc>/docs/api'.
  // Each entry carries the hreflang alternate set across its live translations.
  const localeMap = buildDocLocaleMap();
  const docPages: MetadataRoute.Sitemap = source.getPages('en').flatMap((page) => {
    const barePath = docBarePath(page.slugs);
    const locales = localeMap[docFileKey(page.slugs)] ?? ['en'];
    const languages = Object.fromEntries(
      locales.map((locale) => [locale, localizedUrl(SITE, locale, barePath)]),
    );
    const alternates =
      locales.length > 1
        ? { languages: { ...languages, 'x-default': localizedUrl(SITE, 'en', barePath) } }
        : undefined;
    return locales.map((locale) => ({
      url: localizedUrl(SITE, locale, barePath),
      priority: 0.7,
      lastModified: NOW,
      changeFrequency: 'monthly' as const,
      alternates,
    }));
  });
  const examplePages = allExamples.map((ex) => ({
    url: `${SITE}/examples/${ex.slug}`,
    priority: 0.6,
    lastModified: NOW,
    changeFrequency: 'monthly' as const,
  }));
  return [...staticRoutes, ...docPages, ...examplePages];
}
