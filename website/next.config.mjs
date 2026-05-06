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

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['schematex'],
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    '/examples/[slug]/opengraph-image': [
      './app/(home)/examples/[slug]/_assets/**',
    ],
  },
  webpack(webpackConfig) {
    // Dev: point directly at TypeScript source for live HMR.
    // Production: use the built dist/ (built by Vercel install command).
    if (process.env.NODE_ENV === 'development') {
      webpackConfig.resolve.alias['schematex'] = path.resolve(__dirname, '../src/index.ts');
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
