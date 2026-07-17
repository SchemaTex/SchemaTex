import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { PlausibleAnalytics } from '@/components/plausible-analytics';
import { CookieConsentGA } from '@/components/CookieConsentGA';
import { DIAGRAM_TYPE_COUNT } from '@/lib/diagram-stats';

export const metadata: Metadata = {
  metadataBase: new URL('https://schematex.js.org'),
  title: {
    default: 'Schematex — Diagrams doctors, engineers, and lawyers actually use',
    template: '%s · Schematex',
  },
  description:
    `Every diagram a doctor, engineer, or lawyer would actually use. Free. Fully open source. Made for AI. ${DIAGRAM_TYPE_COUNT} industry-standard diagrams (genogram, pedigree, ladder logic, SLD, UML use case, PRISMA, fishbone, entity structure, ...) from a text DSL. Pure SVG, zero dependencies.`,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/png', sizes: '32x32' },
    ],
  },
  openGraph: {
    title: 'Schematex — Diagrams doctors, engineers, and lawyers actually use',
    description:
      `Free. Fully open source. Made for AI. ${DIAGRAM_TYPE_COUNT} industry-standard diagrams from a text DSL — the ones Mermaid can't draw.`,
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
    description: `Free. Fully open source. Made for AI. ${DIAGRAM_TYPE_COUNT} industry-standard diagrams from a text DSL.`,
  },
  verification: {
    google: 'UqGz5UGD4MAq8_l-V2YAGTpNqBTOHAOy9IixrLZzzgs',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PlausibleAnalytics />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} flex min-h-screen flex-col`}>
        <RootProvider
          theme={{
            // Light by default, no `prefers-color-scheme` follow. Users can
            // still toggle to dark via the header switch.
            defaultTheme: 'light',
            enableSystem: false,
          }}
        >
          {children}
        </RootProvider>
        <CookieConsentGA />
      </body>
    </html>
  );
}
