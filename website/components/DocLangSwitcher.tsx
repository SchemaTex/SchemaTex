'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { DOC_LOCALES, type DocLocale } from '@/lib/source';
import { swapLocale, LOCALE_LABELS, type SupportedLocale } from '@/lib/i18n/locales';

const FLAGS: Record<DocLocale, string> = {
  en: '🇺🇸',
  'zh-Hans': '🇨🇳',
  'zh-Hant': '🇹🇼',
  ja: '🇯🇵',
  de: '🇩🇪',
  'pt-BR': '🇧🇷',
  es: '🇪🇸',
  fr: '🇫🇷',
  ko: '🇰🇷',
};

const SHORT: Record<DocLocale, string> = {
  en: 'EN',
  'zh-Hans': '简体',
  'zh-Hant': '繁體',
  ja: 'JA',
  de: 'DE',
  'pt-BR': 'PT',
  es: 'ES',
  fr: 'FR',
  ko: 'KO',
};

export function DocLangSwitcher({ current }: { current: DocLocale }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function go(target: DocLocale) {
    setOpen(false);
    if (target === current) return;
    router.push(swapLocale(pathname, target as SupportedLocale));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch language"
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-foreground"
      >
        <span aria-hidden className="text-sm leading-none">{FLAGS[current]}</span>
        <span className="text-xs font-medium tabular-nums">{SHORT[current]}</span>
        <ChevronUp />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label="Switch language"
            className="absolute bottom-full left-0 z-50 mb-1.5 min-w-[10rem] overflow-hidden rounded-md border border-fd-border bg-fd-card py-1 shadow-lg"
          >
            {DOC_LOCALES.map((loc) => (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={loc === current}
                  onClick={() => go(loc)}
                  className={
                    'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition ' +
                    (loc === current
                      ? 'text-fd-foreground'
                      : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground')
                  }
                >
                  <span aria-hidden className="text-sm leading-none">{FLAGS[loc]}</span>
                  <span className="flex-1">{LOCALE_LABELS[loc]}</span>
                  {loc === current && <CheckIcon />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ChevronUp() {
  return (
    <svg viewBox="0 0 24 24" className="size-2.5 fill-none stroke-current opacity-40" strokeWidth="2.5" aria-hidden>
      <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current opacity-70" strokeWidth="2.5" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
