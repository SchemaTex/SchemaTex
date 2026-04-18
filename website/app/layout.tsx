import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
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
  openGraph: {
    title: 'Schematex — Text to SVG for domain diagrams',
    description:
      'Like Mermaid, but for the diagrams Mermaid forgot. 13+ standards-compliant diagram types.',
    url: 'https://schematex.dev',
    siteName: 'Schematex',
    type: 'website',
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
      </body>
    </html>
  );
}
