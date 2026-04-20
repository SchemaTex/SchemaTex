import { examplesCollection } from '@/.source/server';
import type { MDXContent } from 'mdx/types';

export interface Example {
  slug: string;
  title: string;
  description?: string;
  diagram: string;
  standard?: string;
  industry: string[];
  persona?: string;
  complexity: number;
  tags: string[];
  featured: boolean;
  relatedLink?: { label: string; href: string };
  status: string;
  dsl: string;
  body: MDXContent;
}

function entryToExample(entry: (typeof examplesCollection)[number]): Example {
  return {
    slug: entry.info.path.replace(/\.mdx$/, ''),
    title: entry.title,
    description: entry.description,
    diagram: entry.diagram,
    standard: entry.standard,
    industry: entry.industry,
    persona: entry.persona,
    complexity: entry.complexity,
    tags: entry.tags,
    featured: entry.featured,
    relatedLink: entry.relatedLink,
    status: entry.status,
    dsl: entry.dsl,
    body: entry.body,
  };
}

export const allExamples: Example[] = (examplesCollection as (typeof examplesCollection)[number][])
  .map(entryToExample)
  .filter((e) => e.status === 'published');

export const examplesBySlug = new Map(allExamples.map((e) => [e.slug, e]));

export function getExample(slug: string): Example | undefined {
  return examplesBySlug.get(slug);
}

export const featuredExamples = allExamples.filter((e) => e.featured);

export const examplesByDiagram = allExamples.reduce<Record<string, Example[]>>((acc, e) => {
  (acc[e.diagram] ??= []).push(e);
  return acc;
}, {});
