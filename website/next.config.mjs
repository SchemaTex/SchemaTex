import { createMDX } from 'fumadocs-mdx/next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['schematex'],
  webpack(webpackConfig) {
    // Point schematex directly at the TypeScript source for live HMR.
    webpackConfig.resolve.alias['schematex'] = path.resolve(__dirname, '../src/index.ts');
    return webpackConfig;
  },
};

export default withMDX(config);
