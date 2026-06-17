'use client';

import { formatStars } from '@/lib/github-stats';
import { REPO_URL } from '@/lib/repo';

/**
 * Shared bottom-center "star us" banner — one visual language across the docs
 * and the playground. Presentational only: callers own when it mounts and the
 * trigger logic (scroll/dwell vs. after-render). Dismissible.
 */
export function StarBanner({
  stars,
  title,
  subtitle,
  leaving = false,
  onStar,
  onDismiss,
}: {
  stars: number;
  title: string;
  subtitle: string;
  leaving?: boolean;
  onStar?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 ${leaving ? '' : 'star-banner-in'}`}
      style={{ opacity: leaving ? 0 : 1, transition: 'opacity .2s ease' }}
      role="complementary"
      aria-label="Support Schematex on GitHub"
    >
      <div
        className="group flex w-full max-w-2xl items-center gap-3 px-4 py-3 shadow-lg backdrop-blur"
        style={{
          border: '1px solid var(--fill-muted)',
          borderRadius: 'var(--r)',
          background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        }}
      >
        <span aria-hidden className="star-glyph text-lg leading-none" style={{ color: 'var(--warn)' }}>
          ★
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-fd-foreground">{title}</p>
          <p className="text-[12px] text-fd-muted-foreground">{subtitle}</p>
        </div>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onStar}
          className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 font-mono text-[13px] font-medium transition hover:opacity-95"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--r-sm)',
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden width={14} height={14} className="fill-current">
            <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.35.96.1-.75.4-1.26.73-1.55-2.55-.3-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.48.11-3.08 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.6.23 2.78.11 3.08.75.81 1.2 1.84 1.2 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
          </svg>
          Star
          {stars > 0 && <span className="tabular-nums opacity-80">{formatStars(stars)}</span>}
        </a>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fd-muted-foreground transition hover:text-fd-foreground"
        >
          <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
