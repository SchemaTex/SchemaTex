import { source } from '@/lib/source';
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { getDocOGEntry } from '@/lib/docs-og-registry';
import { DocsStarCard } from '@/components/DocsStarCard';
import { getRepoStats } from '@/lib/github-stats';

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug, 'en');
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

export const revalidate = false;

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug, 'en');
  if (!page) notFound();

  const docSlug = params.slug?.[0];
  const ogEntry = docSlug ? getDocOGEntry(docSlug) : null;
  const ogImage = ogEntry
    ? {
        url: `/og/docs/${docSlug}`,
        width: 1200,
        height: 630,
        alt: `Schematex — ${ogEntry.title}`,
      }
    : undefined;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: `https://schematex.js.org${page.url}` },
    openGraph: ogImage
      ? {
          title: `${ogEntry?.title ?? ''} · Schematex`,
          description: ogEntry?.standard ?? '',
          images: [ogImage],
        }
      : undefined,
    twitter: ogImage
      ? {
          card: 'summary_large_image',
          title: `${ogEntry?.title ?? ''} · Schematex`,
          description: ogEntry?.standard ?? '',
          images: [ogImage.url],
        }
      : undefined,
  };
}
