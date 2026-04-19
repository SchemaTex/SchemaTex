import Link from 'next/link';
import type { ReactNode } from 'react';
import { DiagramIcon, type DiagramType } from '@/components/DiagramIcon';

interface DiagramCardProps {
  title: string;
  blurb: string;
  href: string;
  preview: ReactNode;
  icon?: DiagramType;
  standard?: string;
}

export function DiagramCard({ title, blurb, href, preview, icon, standard }: DiagramCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden bg-fd-card transition hover:border-[color:var(--stroke)]"
      style={{
        border: '1px solid var(--fill-muted)',
        borderRadius: 'var(--r)',
      }}
    >
      {/* Meta bar — DS mono chrome */}
      <div
        className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-fd-muted-foreground"
        style={{ borderBottom: '1px solid var(--fill-muted)' }}
      >
        {icon && (
          <DiagramIcon
            type={icon}
            size={14}
            className="shrink-0 text-fd-muted-foreground"
          />
        )}
        <span className="text-fd-foreground">{title}</span>
        {standard && (
          <>
            <span className="opacity-40">·</span>
            <span style={{ color: 'var(--accent)' }}>{standard}</span>
          </>
        )}
      </div>

      {/* Stage — dot-grid */}
      <div className="dot-grid flex aspect-[4/3] items-center justify-center overflow-hidden p-4">
        <div className="[&_svg]:max-h-full [&_svg]:max-w-full">{preview}</div>
      </div>

      {/* Blurb */}
      <div
        className="p-3.5"
        style={{ borderTop: '1px solid var(--fill-muted)' }}
      >
        <p className="text-[13px] leading-relaxed text-fd-muted-foreground">
          {blurb}
        </p>
        <span
          className="mt-2 inline-block font-mono text-xs transition-opacity group-hover:opacity-100"
          style={{ color: 'var(--accent)', opacity: 0.6 }}
        >
          open →
        </span>
      </div>
    </Link>
  );
}
