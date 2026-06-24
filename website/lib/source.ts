import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';
import { defineI18n } from 'fumadocs-core/i18n';
import type { SupportedLocale } from '@/lib/i18n/locales';

export const DOC_LOCALES = [
  'en',
  'zh-Hans',
  'zh-Hant',
  'ja',
  'de',
  'pt-BR',
  'es',
  'fr',
  'ko',
] as const satisfies readonly SupportedLocale[];

export type DocLocale = (typeof DOC_LOCALES)[number];

export const docsI18n = defineI18n({
  defaultLanguage: 'en',
  languages: [...DOC_LOCALES],
  fallbackLanguage: 'en',
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n: docsI18n,
});
