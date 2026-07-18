import type { CSSProperties, ReactNode } from 'react';

interface DiagramFrameProps {
  diagram: string;
  standard: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function DiagramFrame({
  diagram,
  standard,
  actions,
  footer,
  children,
  className,
  style,
}: DiagramFrameProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden ${className ?? ''}`}
      style={{
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r)',
        background: 'var(--fill)',
        ...style,
      }}
    >
      <div
        className="diagram-frame-header flex shrink-0 items-center gap-3 px-3 py-2"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <div className="flex gap-1.5">
          <span
            className="size-[9px] rounded-full"
            style={{ background: 'var(--fill-muted)' }}
          />
          <span
            className="size-[9px] rounded-full"
            style={{ background: 'var(--fill-muted)' }}
          />
          <span
            className="size-[9px] rounded-full"
            style={{ background: 'var(--fill-muted)' }}
          />
        </div>
        <div className="diagram-frame-title font-mono text-[13px] text-fd-foreground">
          {diagram}
          <span className="diagram-frame-standard">
            <span className="mx-2 opacity-40">·</span>
            <span style={{ color: 'var(--accent)' }}>§ {standard}</span>
          </span>
        </div>
        {actions ? (
          <div className="diagram-frame-actions ml-auto flex items-center gap-1.5 font-mono">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {footer}
    </div>
  );
}
