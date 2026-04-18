import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-bold tracking-tight">Schematex</span>
    ),
  },
  links: [
    { text: 'Docs', url: '/docs', active: 'nested-url' },
    { text: 'Gallery', url: '/gallery', active: 'nested-url' },
    { text: 'Examples', url: '/examples', active: 'nested-url' },
    { text: 'Playground', url: '/playground' },
    { text: 'GitHub', url: 'https://github.com/victorzhrn/Schematex', external: true },
  ],
};
