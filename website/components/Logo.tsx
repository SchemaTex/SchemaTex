import type { SVGProps } from 'react';

/** The Schematex brand mark: brackets + S-curve graph. */
export function LogoMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* left bracket */}
      <path
        d="M 5 3 H 2.5 V 21 H 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      {/* right bracket */}
      <path
        d="M 19 3 H 21.5 V 21 H 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      {/* S-curve edge */}
      <path
        d="M 16 7 C 16 12, 8 12, 8 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* endpoint nodes */}
      <circle cx="16" cy="7" r="2.2" fill="currentColor" />
      <circle cx="8" cy="17" r="2.2" fill="currentColor" />
    </svg>
  );
}

/** Wordmark: Schema + tex subscript. */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontWeight: 600,
        letterSpacing: '-0.015em',
      }}
    >
      <span>Schema</span>
      <span
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontWeight: 400,
          fontSize: '0.52em',
          transform: 'translateY(0.2em)',
          marginLeft: '2px',
          letterSpacing: 0,
          opacity: 0.65,
        }}
      >
        tex
      </span>
    </span>
  );
}

/** Full logo lockup: mark + wordmark side by side. */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <LogoMark width={size} height={size} />
      <LogoWordmark />
    </span>
  );
}
