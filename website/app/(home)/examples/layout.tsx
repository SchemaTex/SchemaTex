// /examples lives under (home) so it inherits SiteHeader from (home)/layout.tsx.
// Detail pages may override the inner layout, but no docs sidebar/TOC.
import type { ReactNode } from 'react';
export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
