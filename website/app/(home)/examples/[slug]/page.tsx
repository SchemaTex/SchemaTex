import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Playground } from '@/components/Playground';
import { CopyButton } from '@/components/CopyButton';
import { allExamples, getExample } from '@/lib/examples-source';
import { getMDXComponents } from '@/mdx-components';

export function generateStaticParams() {
  return allExamples.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ex = getExample(slug);
  if (!ex) return { title: 'Not found' };
  return {
    title: ex.title,
    description: ex.description,
  };
}

export default async function ExampleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ex = getExample(slug);
  if (!ex) notFound();

  const MDX = ex.body;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-6 text-sm text-fd-muted-foreground">
        <Link href="/examples" className="hover:text-fd-foreground">
          ← Examples
        </Link>
      </nav>

      <header className="mb-6 max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-fd-muted-foreground">
          <span>{ex.diagram}</span>
          {ex.standard && (
            <>
              <span className="opacity-40">·</span>
              <span>{ex.standard}</span>
            </>
          )}
          <span className="opacity-40">·</span>
          <span>{ex.industry.join(', ')}</span>
          <span className="opacity-40">·</span>
          <span>complexity {ex.complexity}/3</span>
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-fd-foreground md:text-4xl">
          {ex.title}
        </h1>
        {ex.description && (
          <p className="mt-3 text-lg leading-relaxed text-fd-muted-foreground">
            {ex.description}
          </p>
        )}
        {ex.persona && (
          <p className="mt-2 text-sm text-fd-muted-foreground opacity-70">{ex.persona}</p>
        )}
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/playground?example=${ex.slug}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-fd-foreground px-3 py-1.5 text-sm font-medium text-fd-background hover:opacity-90"
        >
          Open in Playground →
        </Link>
        <CopyButton text={ex.dsl} label="Copy DSL" />
      </div>

      <Playground initial={ex.dsl} height={560} />

      <div className="mt-10 max-w-3xl prose prose-neutral dark:prose-invert">
        <MDX components={getMDXComponents()} />
      </div>

      {ex.relatedLink && (
        <p className="mt-8 text-sm text-fd-muted-foreground">
          <Link href={ex.relatedLink.href} className="text-fd-primary hover:underline">
            {ex.relatedLink.label} →
          </Link>
        </p>
      )}
    </main>
  );
}
