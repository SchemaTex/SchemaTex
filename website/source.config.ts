import { defineDocs, defineCollections, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
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
    complexity: z.number().min(1).max(3).default(2),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    relatedLink: z
      .object({ label: z.string(), href: z.string() })
      .optional(),
    status: z.enum(['published', 'draft']).default('published'),
    dsl: z.string().transform((s) => s.trim()),
  }),
});

export default defineConfig();
