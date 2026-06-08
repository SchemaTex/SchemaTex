import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { LangSync } from '@/lib/i18n/LangSync';
import { getRepoStats } from '@/lib/github-stats';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import {
  DEFAULT_LOCALE,
  LIVE_LOCALES,
  isPrefixedLocale,
  localeDir,
} from '@/lib/i18n/locales';

// Only emit the live, prefixed locales — never the default (`/en/*` would
// duplicate the bare-path English canonical) and never a locale without a
// shipped dictionary. Extend automatically as LIVE_LOCALES grows.
export function generateStaticParams() {
  return LIVE_LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // Reject `/en/*` and any non-live locale so it can't be indexed as a dupe.
  if (!isPrefixedLocale(lang)) notFound();

  const [{ version, stars }, dict] = await Promise.all([
    getRepoStats(),
    getDictionary(lang),
  ]);

  return (
    <>
      <LangSync locale={lang} />
      <div lang={lang} dir={localeDir(lang)} className="contents">
        <SiteHeader
          version={version}
          stars={stars}
          lang={lang}
          nav={dict.nav}
          switcherLabel={dict.localeSwitcher.label}
        />
        {children}
      </div>
    </>
  );
}
