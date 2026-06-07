import type { Metadata } from 'next';
import { HomeContent } from '@/components/home/HomeContent';
import { getRepoStats } from '@/lib/github-stats';
import { en } from '@/lib/i18n/dictionaries/en';
import { buildLanguageAlternates } from '@/lib/i18n/locales';

const SITE = 'https://schematex.js.org';

export const metadata: Metadata = {
  alternates: {
    canonical: SITE,
    languages: buildLanguageAlternates(SITE, '/'),
  },
};

export default async function HomePage() {
  const { stars } = await getRepoStats();
  return <HomeContent dict={en} lang="en" stars={stars} />;
}
