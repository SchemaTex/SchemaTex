import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { allExamples } from '@/lib/examples-source';
import { LIVE_LOCALES, buildLanguageAlternates, localizedUrl } from '@/lib/i18n/locales';

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
    { url: `${SITE}/docs`, priority: 0.9, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/gallery`, priority: 0.8, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/examples`, priority: 0.7, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/changelog`, priority: 0.6, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/icons`, priority: 0.6, lastModified: NOW, changeFrequency: 'monthly' },
  ];
  const docPages = source.getPages().map((page) => ({
    url: `${SITE}${page.url}`,
    priority: 0.7,
    lastModified: NOW,
    changeFrequency: 'monthly' as const,
  }));
  const examplePages = allExamples.map((ex) => ({
    url: `${SITE}/examples/${ex.slug}`,
    priority: 0.6,
    lastModified: NOW,
    changeFrequency: 'monthly' as const,
  }));
  return [...staticRoutes, ...docPages, ...examplePages];
}
