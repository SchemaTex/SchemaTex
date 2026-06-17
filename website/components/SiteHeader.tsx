'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { GithubStarButton } from '@/components/GithubStarButton';
import { LocaleSwitcher } from '@/lib/i18n/LocaleSwitcher';
import { DEFAULT_LOCALE, localizedPath, type SupportedLocale } from '@/lib/i18n/locales';

// Nav targets are bare English paths (docs/gallery/… aren't translated yet);
// only the labels localize. Defaults match the English dictionary so callers
// that don't pass `nav` (the English `(home)` layout) render unchanged.
const DEFAULT_NAV = {
  docs: 'Docs',
  gallery: 'Gallery',
  icons: 'Icons',
  playground: 'Playground',
  changelog: 'Changelog',
};

type NavLabels = typeof DEFAULT_NAV;

export function SiteHeader({
  version,
  stars,
  lang = DEFAULT_LOCALE,
  nav = DEFAULT_NAV,
  switcherLabel = 'Language',
}: {
  version?: string;
  stars?: number;
  lang?: SupportedLocale;
  nav?: NavLabels;
  switcherLabel?: string;
}) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: nav.docs, href: '/docs' },
    { label: nav.gallery, href: '/gallery' },
    { label: nav.icons, href: '/icons' },
    { label: nav.playground, href: '/playground' },
    { label: nav.changelog, href: '/changelog' },
  ];
  const homeHref = localizedPath(lang, '/');

  return (
    <header className="sticky top-0 z-40 border-b border-fd-border bg-fd-background/80 px-6 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6">
        <Link href={homeHref} className="font-bold tracking-tight text-fd-foreground">
          <Logo size={18} />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {navLinks.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  'rounded-md px-3 py-1.5 transition ' +
                  (active
                    ? 'text-fd-foreground'
                    : 'text-fd-muted-foreground hover:text-fd-foreground')
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://www.npmjs.com/package/schematex"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-fd-border bg-fd-card px-2.5 py-1 font-mono text-xs text-fd-muted-foreground transition hover:border-fd-foreground/40 hover:text-fd-foreground md:inline-flex"
            aria-label="View on npm"
          >
            <span>npm</span>
            {version && <span>{`v${version}`}</span>}
          </a>
          <div className="hidden sm:inline-flex">
            <GithubStarButton stars={stars ?? 0} size="sm" source="header" />
          </div>
          <div className="hidden md:inline-flex">
            <LocaleSwitcher current={lang} variant="header" label={switcherLabel} />
          </div>
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md text-fd-muted-foreground transition hover:text-fd-foreground md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-fd-border md:hidden">
          <ul className="mx-auto max-w-6xl py-2">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-2 text-sm text-fd-muted-foreground hover:text-fd-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-fd-border pt-3">
              <LocaleSwitcher current={lang} variant="footer" label={switcherLabel} />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className="inline-flex size-9 items-center justify-center rounded-md text-fd-muted-foreground transition hover:text-fd-foreground"
    >
      {mounted && (
        <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isDark ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </>
          ) : (
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
          )}
        </svg>
      )}
    </button>
  );
}
