'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LIVE_LOCALES,
  LOCALE_LABELS,
  swapLocale,
  type SupportedLocale,
} from './locales';

/**
 * Language switcher. Lists only LIVE_LOCALES (locales with a real translation)
 * and navigates via URL push — never a cookie redirect, which Google treats as
 * cloaking (playbook §6.5). Switching to the default locale drops the prefix.
 *
 * `variant`:
 *  - `footer` — full-width labelled control sitting in the footer
 *  - `header` — compact globe + current language for the top nav
 */
export function LocaleSwitcher({
  current,
  variant = 'footer',
  label = 'Language',
  locales = LIVE_LOCALES,
}: {
  current: SupportedLocale;
  variant?: 'footer' | 'header';
  label?: string;
  locales?: readonly SupportedLocale[];
}) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function go(target: SupportedLocale) {
    setOpen(false);
    if (target === current) return;
    router.push(swapLocale(pathname, target));
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={
          variant === 'header'
            ? 'inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-fd-muted-foreground transition hover:text-fd-foreground'
            : 'inline-flex items-center gap-2 rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm text-fd-foreground transition hover:border-fd-foreground/40'
        }
      >
        <GlobeIcon />
        <span>{LOCALE_LABELS[current]}</span>
        <ChevronIcon />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label={label}
            className={
              'absolute z-50 max-h-72 min-w-[12rem] overflow-auto rounded-md border border-fd-border bg-fd-card py-1 shadow-lg ' +
              (variant === 'header' ? 'right-0 top-full mt-2' : 'bottom-full mb-2')
            }
          >
            {locales.map((loc) => (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={loc === current}
                  onClick={() => go(loc)}
                  className={
                    'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition ' +
                    (loc === current
                      ? 'text-fd-foreground'
                      : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground')
                  }
                >
                  <span>{LOCALE_LABELS[loc]}</span>
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

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current opacity-60" strokeWidth="2.5" aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2.5" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
