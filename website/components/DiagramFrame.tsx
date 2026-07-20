import type { CSSProperties, ReactNode } from 'react';

interface DiagramFrameProps {
  diagram: string;
  standard: string;
  /** Secondary standards — surfaced on hover so the citation stays one line. */
  standardAlso?: readonly string[];
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function DiagramFrame({
  diagram,
  standard,
  standardAlso,
  actions,
  footer,
  children,
  className,
  style,
}: DiagramFrameProps) {
  // Registry data is external input as far as this component is concerned, so
  // the header clamps to one line no matter how long a citation grows.
  const fullCitation = [`${diagram} · § ${standard}`, ...(standardAlso ?? [])].join('\n');
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
        <div className="diagram-frame-title" title={fullCitation}>
          <span className="diagram-frame-name">{diagram}</span>
          <span className="diagram-frame-standard">
            <span aria-hidden className="diagram-frame-sep">·</span>
            <span className="diagram-frame-standard-text">§ {standard}</span>
          </span>
        </div>
        {actions ? (
          <div className="diagram-frame-actions flex shrink-0 items-center gap-1.5 font-mono">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {footer}
    </div>
  );
}
