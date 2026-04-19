import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { getRepoStats } from '@/lib/github-stats';

export default async function Layout({ children }: { children: ReactNode }) {
  const { version, stars } = await getRepoStats();
  return (
    <>
      <SiteHeader version={version} stars={stars} />
      {children}
    </>
  );
}
