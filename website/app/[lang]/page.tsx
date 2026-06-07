import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomeContent } from '@/components/home/HomeContent';
import { getRepoStats } from '@/lib/github-stats';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { DIAGRAM_TYPE_COUNT } from '@/lib/diagram-stats';
import {
  buildLanguageAlternates,
  isPrefixedLocale,
  localizedUrl,
} from '@/lib/i18n/locales';

const SITE = 'https://schematex.js.org';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isPrefixedLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.meta.title,
    description: dict.meta.description(DIAGRAM_TYPE_COUNT),
    alternates: {
      canonical: localizedUrl(SITE, lang, '/'),
      languages: buildLanguageAlternates(SITE, '/'),
    },
  };
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isPrefixedLocale(lang)) notFound();

  const [{ stars }, dict] = await Promise.all([getRepoStats(), getDictionary(lang)]);
  return <HomeContent dict={dict} lang={lang} stars={stars} />;
}
