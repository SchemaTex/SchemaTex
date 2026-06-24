import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { ThemeToggle } from 'fumadocs-ui/components/layout/theme-toggle';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { StarDocsBanner } from '@/components/StarDocsBanner';
import { getRepoStats } from '@/lib/github-stats';
import { DocLangSwitcher } from '@/components/DocLangSwitcher';

export default async function Layout({ children }: { children: ReactNode }) {
  const { stars } = await getRepoStats();
  return (
    <DocsLayout
      tree={source.pageTree['en']}
      {...baseOptions}
      themeSwitch={{
        component: (
          <>
            <DocLangSwitcher current="en" />
            <ThemeToggle className="ms-auto p-0" />
          </>
        ),
      }}
    >
      {children}
      <StarDocsBanner stars={stars} />
    </DocsLayout>
  );
}
