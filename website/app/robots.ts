import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: [
      'https://schematex.js.org/sitemap.xml',
      'https://schematex.js.org/research/sitemap.xml',
    ],
  };
}
