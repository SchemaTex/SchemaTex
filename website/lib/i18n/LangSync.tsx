'use client';

import { useEffect } from 'react';
import { localeDir } from './locales';

/**
 * Syncs `<html lang>` + `<html dir>` to the active locale on the client.
 *
 * The root `app/layout.tsx` owns the `<html>` element and hardcodes
 * `lang="en"`. Localized pages live under a nested `[lang]` layout that can't
 * re-render `<html>`, so this 14-line effect patches the attributes after
 * mount. `dir` flips to `rtl` for Batch 2 locales (ar/he) — wired now so the
 * RTL batch only has to extend RTL_LOCALES.
 *
 * (Same approach as the cross-product ai-docs `lang-sync.tsx`.)
 */
export function LangSync({ locale }: { locale: string }) {
  useEffect(() => {
    const el = document.documentElement;
    if (el.lang !== locale) el.lang = locale;
    const dir = localeDir(locale);
    if (el.dir !== dir) el.dir = dir;
    return () => {
      // Restore English defaults when leaving a localized subtree.
      el.lang = 'en';
      el.dir = 'ltr';
    };
  }, [locale]);

  return null;
}
