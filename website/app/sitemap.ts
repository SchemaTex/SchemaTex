import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { examples } from '@/lib/examples-data';

const SITE = 'https://schematex.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, priority: 1 },
    { url: `${SITE}/playground`, priority: 0.9 },
    { url: `${SITE}/docs`, priority: 0.9 },
    { url: `${SITE}/examples`, priority: 0.8 },
  ];
  const docPages = source.getPages().map((page) => ({
    url: `${SITE}${page.url}`,
    priority: 0.7,
  }));
  const examplePages = examples.map((ex) => ({
    url: `${SITE}/examples/${ex.slug}`,
    priority: 0.7,
  }));
  return [...staticRoutes, ...docPages, ...examplePages];
}
