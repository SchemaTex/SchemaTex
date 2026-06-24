import { source } from '@/lib/source';
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { DocsStarCard } from '@/components/DocsStarCard';
import { getRepoStats } from '@/lib/github-stats';

// Languages that have doc translations. Expand as more land.
const DOC_LOCALES = new Set(Object.keys(source.pageTree).filter((l) => l !== 'en'));

export default async function LocalizedDocsPage(props: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { lang, slug } = await props.params;

  // Unsupported locale — redirect to English
  if (!DOC_LOCALES.has(lang)) {
    redirect(`/docs${slug?.length ? `/${slug.join('/')}` : ''}`);
  }

  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const { stars } = await getRepoStats();

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
        <DocsStarCard stars={stars} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { lang, slug } = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) return {};

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: `https://schematex.js.org/docs${slug?.length ? `/${slug.join('/')}` : ''}`,
    },
  };
}
