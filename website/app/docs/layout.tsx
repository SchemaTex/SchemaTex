import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { StarDocsBanner } from '@/components/StarDocsBanner';
import { getRepoStats } from '@/lib/github-stats';

export default async function Layout({ children }: { children: ReactNode }) {
  const { stars } = await getRepoStats();
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {children}
      <StarDocsBanner stars={stars} />
    </DocsLayout>
  );
}
