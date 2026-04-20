'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { GithubStarButton } from '@/components/GithubStarButton';

const NAV_LINKS = [
  { label: 'Docs', href: '/docs' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Examples', href: '/examples' },
  { label: 'Playground', href: '/playground' },
];

export function SiteHeader({ version, stars }: { version?: string; stars?: number }) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-fd-border bg-fd-background/80 px-6 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6">
        <Link href="/" className="font-bold tracking-tight text-fd-foreground">
          <Logo size={18} />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {NAV_LINKS.map((l) => {
            const active =
              l.href === '/'
                ? pathname === '/'
                : pathname.startsWith(l.href);
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
            <svg viewBox="0 0 780 250" aria-hidden className="h-2.5 w-auto fill-current">
              <path d="M240 250V0H0v250h240zm-160-40V40h80v130h40V40h40v170H80zM640 0v250h140V0H640zm100 170h-40V40h40v130zM280 0v250h160V40h40v210h40V40h40v210h40V0H280zm120 170h-40V40h40v130z"/>
            </svg>
            {version ? `v${version}` : 'npm'}
          </a>
          <div className="hidden sm:inline-flex">
            <GithubStarButton stars={stars ?? 0} size="sm" />
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
            {NAV_LINKS.map((l) => (
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
