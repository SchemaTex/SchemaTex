// ───────────────────────────────────────────────────────────────────
// Single source of truth for all locale behaviour.
//
// Adapted from the cross-product i18n pattern (ai-docs
// `packages/seo/src/i18n/locales.ts`) so Schematex stays stack-consistent
// with the other products. Shape is intentionally compatible with fumadocs
// `defineI18n({ languages, defaultLanguage, hideLocale: 'default-locale' })`
// so a future docs/examples i18n pass can reuse this file verbatim.
//
// Hard rule (CoCEO playbook §6.5): DEFAULT_LOCALE is NEVER prefixed.
//   schematex.js.org/        → English canonical
//   schematex.js.org/zh-Hans → localized
// Prefixing English measurably tanks ranking, so `localizedPath('en', …)`
// returns the bare path.
// ───────────────────────────────────────────────────────────────────

/** Bare-path canonical locale. Never carries a URL prefix. */
export const DEFAULT_LOCALE = 'en';

/**
 * Every locale the site intends to support. Batch 1 = 14 LTR languages
 * (first 8 aligned with other products' locale set), Batch 2 = 2 RTL.
 * Translation files land incrementally — see LIVE_LOCALES for what is
 * actually shipped right now.
 */
export const SUPPORTED_LOCALES = [
  'en',
  // Batch 1 — LTR
  'es',
  'pt-BR',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'zh-Hant',
  'zh-Hans',
  'ru',
  'hi',
  'id',
  'tr',
  'vi',
  // Batch 2 — RTL
  'ar',
  'he',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Locales with a translation actually shipped (have a dictionary file).
 * generateStaticParams / the locale switcher / hreflang all read from here,
 * NOT from SUPPORTED_LOCALES — advertising a locale that 404s or that serves
 * untranslated English is worse than not advertising it (duplicate content,
 * broken hreflang). Extend this list as each language's dictionary lands.
 */
export const LIVE_LOCALES = [
  'en',
  'es',
  'pt-BR',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'zh-Hant',
  'zh-Hans',
  'ru',
  'hi',
  'id',
  'tr',
  'vi',
  'ar',
  'he',
] as const satisfies readonly SupportedLocale[];

export type LiveLocale = (typeof LIVE_LOCALES)[number];

/**
 * Locales the documentation is actually translated into (have `*.{locale}.mdx`
 * files under content/docs). A subset of LIVE_LOCALES — docs translation lands
 * separately from the marketing pages. Defined here (a client-safe module with
 * no `node:` imports) rather than in lib/source.ts so the client-side
 * DocLangSwitcher can import it without dragging fumadocs' server runtime —
 * which uses `node:fs/promises` — into the browser bundle (webpack
 * UnhandledSchemeError on `node:` URIs otherwise).
 */
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

/** Right-to-left locales — need `dir="rtl"` + direction-aware CSS (Batch 2). */
export const RTL_LOCALES = ['ar', 'he'] as const satisfies readonly SupportedLocale[];

/** Native display names for the locale switcher. */
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  'pt-BR': 'Português (BR)',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  'zh-Hant': '繁體中文',
  'zh-Hans': '简体中文',
  ru: 'Русский',
  hi: 'हिन्दी',
  id: 'Bahasa Indonesia',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
  ar: 'العربية',
  he: 'עברית',
};

// ───────────────────────────────────────────────────────────────────
// Guards
// ───────────────────────────────────────────────────────────────────

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function isLiveLocale(locale: string): locale is LiveLocale {
  return (LIVE_LOCALES as readonly string[]).includes(locale);
}

/** A live locale that carries a URL prefix (i.e. live and not the default). */
export function isPrefixedLocale(
  locale: string,
): locale is Exclude<LiveLocale, typeof DEFAULT_LOCALE> {
  return isLiveLocale(locale) && locale !== DEFAULT_LOCALE;
}

export function localeDir(locale: string): 'rtl' | 'ltr' {
  return (RTL_LOCALES as readonly string[]).includes(locale) ? 'rtl' : 'ltr';
}

// ───────────────────────────────────────────────────────────────────
// URL helpers
// ───────────────────────────────────────────────────────────────────

function getLocalePrefix(locale: string): string {
  return isPrefixedLocale(locale) ? `/${locale}` : '';
}

export function localizedPath(locale: string, path: string): string {
  // The homepage path '/' contributes no segment, so a prefixed locale yields
  // exactly '/zh-Hans' (NOT '/zh-Hans/', which would 308-redirect and make
  // canonical/hreflang point at a redirecting URL).
  const segment = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${getLocalePrefix(locale)}${segment}` || '/';
}

export function localizedUrl(origin: string, locale: string, path: string): string {
  const p = localizedPath(locale, path);
  // Never produce a trailing slash on the bare origin (https://example.com/ →
  // https://example.com). Canonical and hreflang must agree on the form.
  return p === '/' ? origin : `${origin}${p}`;
}

/**
 * hreflang map for a given path. Defaults to LIVE_LOCALES — only ever list
 * locales that genuinely have this page translated, plus the mandatory
 * `x-default` pointing at the English canonical.
 */
export function buildLanguageAlternates(
  origin: string,
  path: string,
  locales: readonly string[] = LIVE_LOCALES,
): Record<string, string> {
  const live = locales.filter(isLiveLocale);
  const languages = Object.fromEntries(
    live.map((locale) => [locale, localizedUrl(origin, locale, path)]),
  );
  const xDefault = live.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : (live[0] ?? DEFAULT_LOCALE);
  return {
    ...languages,
    'x-default': localizedUrl(origin, xDefault, path),
  };
}

/**
 * Swap the locale of an in-app pathname (client switcher). Strips any existing
 * live-locale prefix, then applies the target's prefix (none for default).
 *   swapLocale('/zh-Hans', 'en')      → '/'
 *   swapLocale('/', 'zh-Hans')        → '/zh-Hans'
 *   swapLocale('/zh-Hans/docs', 'en') → '/docs'
 */
export function swapLocale(pathname: string, target: SupportedLocale): string {
  const firstSeg = pathname.split('/')[1] ?? '';
  let rest = pathname;
  if (isPrefixedLocale(firstSeg)) {
    rest = pathname.slice(firstSeg.length + 1) || '/';
  }
  if (target === DEFAULT_LOCALE) return rest === '' ? '/' : rest;
  return `/${target}${rest === '/' ? '' : rest}`;
}
