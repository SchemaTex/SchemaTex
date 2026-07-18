import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { REPO_URL } from '@/lib/repo';
import { source, type DocLocale } from '@/lib/source';
import { DocLangSwitcher } from '@/components/DocLangSwitcher';
import { ThemeToggle } from '@/components/SiteHeader';

// Localized docs layout — sits under [lang]/layout.tsx which already renders
// SiteHeader, so we disable the fumadocs top-nav to avoid a double bar.
// The sidebar still renders for all translated locales.
export default async function LocalizedDocsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locales = Object.keys(source.pageTree) as (keyof typeof source.pageTree)[];
  const treeLocale = (locales.includes(lang as never) ? lang : 'en') as keyof typeof source.pageTree;
  const pageTree = source.pageTree[treeLocale];

  const docLang = (locales.includes(lang as never) ? lang : 'en') as DocLocale;

  return (
    <DocsLayout
      tree={pageTree}
      nav={{ enabled: false }}
      githubUrl={REPO_URL}
      themeSwitch={{
        component: (
          <>
            <DocLangSwitcher current={docLang} />
            <ThemeToggle compact />
          </>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
