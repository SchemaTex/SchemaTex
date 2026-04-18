import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';
import { examplesSource } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={examplesSource.pageTree} {...baseOptions} nav={{ ...baseOptions.nav }}>
      {children}
    </DocsLayout>
  );
}
