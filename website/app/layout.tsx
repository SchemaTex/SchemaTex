import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import Script from 'next/script';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://schematex.js.org'),
  title: {
    default: 'Schematex — Diagrams doctors, engineers, and lawyers actually use',
    template: '%s · Schematex',
  },
  description:
    'Every diagram a doctor, engineer, or lawyer would actually use. Free. Fully open source. Made for AI. 20 industry-standard diagrams (genogram, pedigree, ladder logic, SLD, phylo, fishbone, entity structure, ...) from a text DSL. Pure SVG, zero dependencies.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/png', sizes: '32x32' },
    ],
  },
  openGraph: {
    title: 'Schematex — Diagrams doctors, engineers, and lawyers actually use',
    description:
      'Free. Fully open source. Made for AI. 20 industry-standard diagrams from a text DSL — the ones Mermaid can\'t draw.',
    url: 'https://schematex.js.org',
    siteName: 'Schematex',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Schematex — Every diagram a doctor, engineer, or lawyer would actually use',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Schematex — Diagrams doctors, engineers, and lawyers actually use',
    description: 'Free. Fully open source. Made for AI. 20 industry-standard diagrams from a text DSL.',
  },
  verification: {
    google: 'uqdjccFb66g-qLb9LNOCW7MoCKJiEZ_0knXoRe6pm7A',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
        <Script
          defer
          data-domain="schematex.js.org"
          src="https://plausible.ideamarketfit.com/js/script.js"
        />
      </body>
    </html>
  );
}
