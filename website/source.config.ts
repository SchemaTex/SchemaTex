import { defineDocs, defineCollections, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

interface MarkdownNode {
  type: string;
}

interface MdxElement extends MarkdownNode {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
  name: string | null;
  children: MarkdownNode[];
}

interface MarkdownStringifierState {
  containerFlow: (node: MdxElement, info: unknown) => string;
  containerPhrasing: (node: MdxElement, info: unknown) => string;
}

function isMdxElement(node: MarkdownNode): node is MdxElement {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

function stringifyLlmMdx(
  node: MarkdownNode,
  _parent: MarkdownNode | undefined,
  state: MarkdownStringifierState,
  info: unknown,
): string | undefined {
  if (!isMdxElement(node)) return undefined;

  if (node.name === 'Playground') {
    // MDX normalizes indentation inside JSX template-literal attributes. Keep
    // a marker here; the route hydrates it from getText('raw') so nested DSL
    // examples retain the exact source whitespace required by their parsers.
    return '\n<!-- SCHEMATEX_PLAYGROUND -->\n';
  }

  if (node.name === 'Callout' && node.type === 'mdxJsxFlowElement') {
    return state.containerFlow(node, info);
  }
  if (node.name === 'MCPConnectCard') {
    return '\n[Connect to the hosted Schematex MCP](https://schematex.js.org/mcp)\n';
  }
  if (node.name === 'DiagramCatalog') {
    return '\n[Browse all supported diagram types](https://schematex.js.org/diagrams)\n';
  }
  if (node.name === 'RelatedExamples') {
    return '\n[Browse related examples](https://schematex.js.org/examples)\n';
  }

  if (node.children.length === 0) return '\n';
  return node.type === 'mdxJsxTextElement'
    ? state.containerPhrasing(node, info)
    : state.containerFlow(node, info);
}

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    postprocess: {
      // Export clean Markdown alongside the compiled MDX so /llms-full.txt and
      // every /docs/*.md endpoint contain model-readable content, not JSX.
      includeProcessedMarkdown: {
        headingIds: false,
        stringify: stringifyLlmMdx,
      },
    },
  },
});

export const examplesCollection = defineCollections({
  type: 'doc',
  dir: 'content/examples',
  schema: frontmatterSchema.extend({
    diagram: z.string(),
    standard: z.string().optional(),
    industry: z.union([z.string(), z.array(z.string())]).transform((v) =>
      Array.isArray(v) ? v : [v],
    ),
    persona: z.string().optional(),
    complexity: z.number().min(1).max(5).default(2),
    tags: z.array(z.union([z.string(), z.number().transform(String)])).default([]),
    featured: z.boolean().default(false),
    relatedLink: z
      .object({ label: z.string(), href: z.string() })
      .optional(),
    status: z.enum(['published', 'draft']).default('published'),
    dsl: z.string().transform((s) => s.trim()),
  }),
});

export default defineConfig();
