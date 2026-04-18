import Link from 'next/link';
import type { ReactNode } from 'react';

interface DiagramCardProps {
  title: string;
  blurb: string;
  href: string;
  preview: ReactNode;
  icon?: string;
}

export function DiagramCard({ title, blurb, href, preview, icon }: DiagramCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card transition-all hover:-translate-y-0.5 hover:border-fd-primary hover:shadow-lg"
    >
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-white p-4">
        <div className="[&_svg]:max-h-full [&_svg]:max-w-full">{preview}</div>
      </div>
      <div className="border-t border-fd-border p-4">
        <div className="mb-1 flex items-center gap-2 text-fd-foreground">
          {icon && <span className="text-xl leading-none">{icon}</span>}
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-fd-muted-foreground">{blurb}</p>
        <span className="mt-3 inline-block text-sm font-medium text-fd-primary opacity-0 transition group-hover:opacity-100">
          Explore →
        </span>
      </div>
    </Link>
  );
}
