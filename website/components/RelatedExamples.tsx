import { examplesBySlug } from '@/lib/examples-source';
import { GalleryGrid } from '@/components/GalleryGrid';
import type { DiagramType, Industry, GalleryExample } from '@/lib/gallery-examples';

export function RelatedExamples({ slugs }: { slugs: string[] }) {
  const examples: GalleryExample[] = slugs
    .map((slug) => examplesBySlug.get(slug))
    .filter((ex): ex is NonNullable<typeof ex> => ex !== undefined)
    .map((ex) => ({
      slug: ex.slug,
      title: ex.title,
      description: ex.description ?? ex.title,
      diagram: ex.diagram as DiagramType,
      industry: (ex.industry[0] ?? 'healthcare') as Industry,
      complexity: ex.complexity as 1 | 2 | 3,
      standard: ex.standard ?? '',
      dsl: ex.dsl,
      hasDetailPage: true,
    }));

  if (examples.length === 0) return null;
  return (
    <div className="not-prose [&_a]:no-underline [&_a]:text-inherit [&_article]:!p-0 [&_article]:!m-0">
      <GalleryGrid examples={examples} />
    </div>
  );
}
