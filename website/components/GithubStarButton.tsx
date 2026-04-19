import { formatStars } from '@/lib/github-stats';

interface GithubStarButtonProps {
  stars: number;
  size?: 'sm' | 'md';
}

export function GithubStarButton({ stars, size = 'md' }: GithubStarButtonProps) {
  const pad = size === 'sm' ? '4px 8px' : '6px 10px';
  const iconSize = size === 'sm' ? 14 : 16;
  const text = size === 'sm' ? 'text-xs' : 'text-[13px]';
  return (
    <a
      href="https://github.com/victorzhrn/Schematex"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Star Schematex on GitHub${stars > 0 ? ` — ${stars} stars` : ''}`}
      className={`group inline-flex items-stretch overflow-hidden font-mono ${text} transition hover:border-[color:var(--stroke)]`}
      style={{
        border: '1px solid var(--fill-muted)',
        borderRadius: 'var(--r-sm)',
        background: 'var(--fill)',
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 text-fd-muted-foreground transition group-hover:text-fd-foreground"
        style={{ padding: pad }}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          width={iconSize}
          height={iconSize}
          className="fill-current"
        >
          <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.35.96.1-.75.4-1.26.73-1.55-2.55-.3-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.48.11-3.08 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.6.23 2.78.11 3.08.75.81 1.2 1.84 1.2 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
        </svg>
        <span>Star</span>
      </span>
      <span
        className="inline-flex items-center gap-1 tabular-nums"
        style={{
          padding: pad,
          borderLeft: '1px solid var(--fill-muted)',
          background: 'var(--fill-muted)',
          color: 'var(--accent-ink)',
        }}
      >
        <span aria-hidden style={{ color: 'var(--warn)' }}>
          ★
        </span>
        {stars > 0 ? formatStars(stars) : '—'}
      </span>
    </a>
  );
}
