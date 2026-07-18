import { createMDX } from 'fumadocs-mdx/next';
import { withSentryConfig } from '@sentry/nextjs';
import { withPlausibleProxy } from 'next-plausible';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const withMDX = createMDX();

// First-party Plausible proxy: rewrites /proxy/api/event + /js/script*.js to
// plausible.ideamarketfit.com so analytics runs on a same-origin path,
// bypassing ad blockers (uBlock/Brave/DDG). schematex.js.org is on Vercel via
// js.org subdomain — no Cloudflare in front, so no WAF rule needed (unlike
// the .ai/.com zones). Refs CoCEO study 2026-05-03-plausible-deployment-architecture §5.4.
const withPlausibleProxyWrapper = withPlausibleProxy({
  customDomain: 'https://plausible.ideamarketfit.com',
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async rewrites() {
    const routes = [
      // Clean Markdown mirrors for coding agents and plain-text clients.
      { source: '/docs.md', destination: '/llms.mdx/docs' },
      { source: '/docs/:path*.md', destination: '/llms.mdx/docs/:path*' },
      { source: '/:lang/docs.md', destination: '/llms.mdx/:lang/docs' },
      { source: '/:lang/docs/:path*.md', destination: '/llms.mdx/:lang/docs/:path*' },
    ];
    if (GA_ID) {
      routes.push(
        { source: '/js/gtag.js', destination: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` },
        { source: '/g/collect', destination: 'https://www.google-analytics.com/g/collect' },
      );
    }
    return routes;
  },
  transpilePackages: ['schematex'],
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    '/examples/[slug]/opengraph-image': [
      './app/(home)/examples/[slug]/_assets/**',
    ],
  },
  webpack(webpackConfig, { dev }) {
    // Dev: point directly at TypeScript source for live HMR.
    // Production: use the built dist/ (built by Vercel install command).
    if (dev) {
      webpackConfig.resolve.alias['schematex$'] = path.resolve(__dirname, '../src/index.ts');
      webpackConfig.resolve.alias['schematex/ai'] = path.resolve(__dirname, '../src/ai/index.ts');
    }
    // 676 MDX modules (54 EN + 422 locale variants + 199 examples) cause the
    // webpack PackFileCacheStrategy to OOM on Vercel's 8 GB build machine when
    // it tries to serialize the enlarged module graph. Disable filesystem caching
    // for production builds so the cache is never written; each build recompiles
    // from scratch, which is still fast enough (~90 s webpack phase).
    if (!dev) {
      webpackConfig.cache = false;
    }
    return webpackConfig;
  },
};

export default withSentryConfig(withPlausibleProxyWrapper(withMDX(config)), {
  org: 'imf-hy',
  project: 'schematex',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
  disableLogger: true,
});
