import type { Dictionary } from './dictionaries/en';
import { en } from './dictionaries/en';
import type { SupportedLocale } from './locales';

// Lazy per-locale loaders. Only locales with a shipped dictionary appear here;
// anything else falls back to English (and such a locale should never reach a
// rendered page anyway — generateStaticParams only emits LIVE_LOCALES).
const loaders: Partial<Record<SupportedLocale, () => Promise<Dictionary>>> = {
  en: async () => en,
  es: () => import('./dictionaries/es').then((m) => m.default),
  'pt-BR': () => import('./dictionaries/pt-BR').then((m) => m.default),
  fr: () => import('./dictionaries/fr').then((m) => m.default),
  de: () => import('./dictionaries/de').then((m) => m.default),
  it: () => import('./dictionaries/it').then((m) => m.default),
  ja: () => import('./dictionaries/ja').then((m) => m.default),
  ko: () => import('./dictionaries/ko').then((m) => m.default),
  'zh-Hant': () => import('./dictionaries/zh-Hant').then((m) => m.default),
  'zh-Hans': () => import('./dictionaries/zh-Hans').then((m) => m.default),
  ru: () => import('./dictionaries/ru').then((m) => m.default),
  hi: () => import('./dictionaries/hi').then((m) => m.default),
  id: () => import('./dictionaries/id').then((m) => m.default),
  tr: () => import('./dictionaries/tr').then((m) => m.default),
  vi: () => import('./dictionaries/vi').then((m) => m.default),
  ar: () => import('./dictionaries/ar').then((m) => m.default),
  he: () => import('./dictionaries/he').then((m) => m.default),
};

export async function getDictionary(locale: string): Promise<Dictionary> {
  const load = loaders[locale as SupportedLocale] ?? (() => Promise.resolve(en));
  return load();
}
