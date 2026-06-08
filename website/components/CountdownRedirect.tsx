'use client';

import { useEffect, useState } from 'react';

/**
 * Human-only countdown back to the homepage. Lives entirely client-side, so
 * the page still responds with a real HTTP 404 — crawlers see the 404 status
 * and never run this redirect, which keeps us clear of "soft 404" penalties.
 * Cancelable: a lost visitor who wants to read the URL or hit back can stay.
 */
export function CountdownRedirect({
  seconds = 12,
  to = '/',
}: {
  seconds?: number;
  to?: string;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active) return;
    if (remaining <= 0) {
      window.location.assign(to);
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, active, to]);

  if (!active) {
    return (
      <p className="text-sm text-fd-muted-foreground" role="status">
        Staying put. Use the links above whenever you’re ready.
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-fd-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span>
        Routing you home in{' '}
        <span className="font-mono font-semibold text-fd-foreground tabular-nums">
          {remaining}s
        </span>
      </span>
      <button
        type="button"
        onClick={() => setActive(false)}
        className="rounded-md border border-fd-border px-2.5 py-1 font-medium text-fd-foreground transition-colors hover:bg-fd-accent"
      >
        Stay on this page
      </button>
    </div>
  );
}
