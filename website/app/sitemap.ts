import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { allExamples } from '@/lib/examples-source';

const SITE = 'https://schematex.js.org';
const NOW = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, priority: 1, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/playground`, priority: 0.9, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/docs`, priority: 0.9, lastModified: NOW, changeFrequency: 'weekly' },
    { url: `${SITE}/gallery`, priority: 0.8, lastModified: NOW, changeFrequency: 'weekly' },
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
