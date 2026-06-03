import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Playground } from '@/components/Playground';
import { RelatedExamples } from '@/components/RelatedExamples';
import { MCPConnectCard } from '@/components/MCPConnectCard';
import { DiagramCatalog } from '@/components/DiagramCatalog';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Playground,
    RelatedExamples,
    MCPConnectCard,
    DiagramCatalog,
    ...components,
  };
}
