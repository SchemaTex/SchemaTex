import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';
import { defineI18n } from 'fumadocs-core/i18n';
import { DOC_LOCALES, type DocLocale } from '@/lib/i18n/locales';

// Re-exported for back-compat: DOC_LOCALES / DocLocale now live in the
// client-safe lib/i18n/locales module (see the note there). Server-side
// callers can keep importing them from '@/lib/source'.
export { DOC_LOCALES, type DocLocale };

export const docsI18n = defineI18n({
  defaultLanguage: 'en',
  languages: [...DOC_LOCALES],
  fallbackLanguage: 'en',
  hideLocale: 'default-locale',
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n: docsI18n,
});
