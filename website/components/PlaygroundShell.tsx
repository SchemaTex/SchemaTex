import type { CSSProperties, ReactNode } from 'react';

interface PlaygroundShellProps {
  /** Command-bar left group: name + citation + capability chips. */
  identity: ReactNode;
  /** Command-bar right group: ⌘K, copy, share, export, render. */
  actions: ReactNode;
  /** Bottom status bar contents. */
  status: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * The playground editor IS the page, not a widget on it — so this shell draws
 * no card, no radius, and no window chrome. `DiagramFrame` (the rounded,
 * traffic-lit frame) stays a marketing component for the homepage, where
 * "this diagram lives inside an app" is the message. Inside the app that same
 * frame reads as "here is a picture of an app", which is what made the
 * playground feel like a product within a product.
 */
export function PlaygroundShell({
  identity,
  actions,
  status,
  children,
  className,
  style,
}: PlaygroundShellProps) {
  return (
    <div className={`sx-editor-shell ${className ?? ''}`} style={style}>
      <div className="sx-command-bar">
        {identity}
        <div className="sx-command-actions">{actions}</div>
      </div>
      {children}
      <div className="sx-status-bar">{status}</div>
    </div>
  );
}
