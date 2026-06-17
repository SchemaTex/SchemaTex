import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { REPO_URL } from '@/lib/repo';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-bold tracking-tight">Schematex</span>
    ),
  },
  // `githubUrl` renders fumadocs' built-in GitHub icon button in the nav —
  // more recognizable than a plain text link, and the canonical repo.
  githubUrl: REPO_URL,
  links: [
    { text: 'Docs', url: '/docs', active: 'nested-url' },
    { text: 'Gallery', url: '/gallery', active: 'nested-url' },
    { text: 'Examples', url: '/examples', active: 'nested-url' },
    { text: 'Playground', url: '/playground' },
  ],
};
