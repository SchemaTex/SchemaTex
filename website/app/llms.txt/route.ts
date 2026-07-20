import { docBarePath } from '@/lib/docs-locales';
import { LLM_CACHE_HEADERS, SITE_URL } from '@/lib/llm-docs';
import { source } from '@/lib/source';

export const revalidate = false;

const PRIORITY_SLUGS = [
  'getting-started',
  'interactive-editing',
  'api',
  'ai-integration',
  'syntax',
] as const;

export function GET() {
  const pages = source.getPages('en');
  const bySlug = new Map(pages.map((page) => [page.slugs.join('/'), page]));
  const priority = PRIORITY_SLUGS.flatMap((slug) => {
    const page = bySlug.get(slug);
    return page ? [page] : [];
  });
  const remaining = pages
    .filter((page) => !PRIORITY_SLUGS.includes(page.slugs.join('/') as typeof PRIORITY_SLUGS[number]))
    .sort((a, b) => a.data.title.localeCompare(b.data.title));

  const docLink = (page: (typeof pages)[number]) => {
    const path = docBarePath(page.slugs);
    const suffix = page.data.description ? `: ${page.data.description}` : '';
    return `- [${page.data.title}](${SITE_URL}${path}.md)${suffix}`;
  };

  const body = [
    '# Schematex',
    '',
    '> Open-source text-to-SVG diagram renderer and controlled React editor for 50 industry-standard diagram types. Every interactive edit persists as ordinary Schematex DSL.',
    '',
    'Canonical site: https://schematex.js.org',
    'Source: https://github.com/SchemaTex/SchemaTex',
    'npm: https://www.npmjs.com/package/schematex',
    '',
    '## Start here',
    '',
    ...priority.map(docLink),
    '',
    '## Machine-readable resources',
    '',
    '- [Complete documentation corpus](https://schematex.js.org/llms-full.txt): all English docs as processed Markdown.',
    '- [Interactive capability registry](https://schematex.js.org/api/interactive-capabilities): exact text and position editing support for every diagram type.',
    '- [Hosted MCP endpoint](https://schematex.js.org/mcp): Streamable HTTP MCP with discovery, syntax, validation, rendering, inspection, and atomic edit tools.',
    '- Any canonical docs URL has a Markdown mirror by appending `.md`, for example `/docs/circuit.md`.',
    '',
    '## Package entry points',
    '',
    '- `schematex`: render, parse, result APIs, types, and capability discovery.',
    '- `schematex/react`: `SchematexDiagram` and controlled `InteractiveSchematexDiagram`.',
    '- `schematex/interactive`: low-level Vanilla DOM editing primitives.',
    '- `schematex/ai`: framework-neutral discovery, validation, inspection, and atomic edit functions.',
    '- `schematex/ai/sdk`: Vercel AI SDK tool adapters.',
    '- `schematex/browser`: strict and preview-safe DOM render helpers.',
    '',
    '## Installation',
    '',
    '```bash',
    'npm install schematex',
    '```',
    '',
    '## All documentation',
    '',
    ...remaining.map(docLink),
    '',
  ].join('\n');

  return new Response(body, { headers: LLM_CACHE_HEADERS });
}
