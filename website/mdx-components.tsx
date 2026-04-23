import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Playground } from '@/components/Playground';
import { RelatedExamples } from '@/components/RelatedExamples';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Playground,
    RelatedExamples,
    ...components,
  };
}
