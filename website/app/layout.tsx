import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import Script from 'next/script';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://schematex.dev'),
  title: {
    default: 'Schematex — Text to SVG for domain diagrams',
    template: '%s · Schematex',
  },
  description:
    'Zero-dependency TypeScript library. Compile plain text into standards-compliant SVG: genograms, ecomaps, pedigrees, phylogenetic trees, sociograms, ladder logic, single-line diagrams, and more.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'Schematex — Text to SVG for domain diagrams',
    description:
      'Like Mermaid, but for the diagrams Mermaid forgot. 20 standards-compliant diagram types.',
    url: 'https://schematex.dev',
    siteName: 'Schematex',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Schematex — Standards-as-code for professional diagrams',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Schematex',
    description: 'Text to SVG for domain diagrams.',
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
