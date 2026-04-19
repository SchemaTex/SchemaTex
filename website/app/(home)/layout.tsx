import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/SiteHeader';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
