import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/SiteHeader';
import { REPO_URL } from '@/lib/repo';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-40 flex h-10 shrink-0 items-center gap-4 px-4 text-sm"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}
      >
        <Link href="/" className="font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          <Logo size={16} />
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-muted)' }}>Playground</span>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/gallery" className="text-fd-muted-foreground hover:text-fd-foreground">
            Gallery
          </Link>
          <Link href="/docs" className="text-fd-muted-foreground hover:text-fd-foreground">
            Docs
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fd-muted-foreground hover:text-fd-foreground"
          >
            GitHub
          </a>
          <ThemeToggle compact />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
