import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-10 shrink-0 items-center gap-4 border-b border-fd-border bg-fd-background px-4 text-sm">
        <Link href="/" className="font-semibold tracking-tight text-fd-foreground">
          <Logo size={16} />
        </Link>
        <span className="text-fd-muted-foreground">/</span>
        <span className="text-fd-muted-foreground">Playground</span>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/examples" className="text-fd-muted-foreground hover:text-fd-foreground">
            Examples
          </Link>
          <Link href="/docs" className="text-fd-muted-foreground hover:text-fd-foreground">
            Docs
          </Link>
          <a
            href="https://github.com/victorzhrn/Schematex"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fd-muted-foreground hover:text-fd-foreground"
          >
            GitHub
          </a>
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
