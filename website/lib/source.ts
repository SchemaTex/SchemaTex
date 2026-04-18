import { docs, examples } from '@/.source/server';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});

export const examplesSource = loader({
  baseUrl: '/examples',
  source: examples.toFumadocsSource(),
});
