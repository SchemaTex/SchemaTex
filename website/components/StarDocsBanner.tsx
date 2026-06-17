'use client';

import { useEffect, useState } from 'react';
import { usePlausible } from 'next-plausible';
import { StarBanner } from '@/components/StarBanner';

const DISMISS_KEY = 'schematex.starBanner.dismissedUntil';
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCROLL_TRIGGER = 0.5; // fire after the reader passes 50% of the page
const TIME_TRIGGER_MS = 25_000; // …or 25s of dwell, whichever comes first

/**
 * Quiet "star us" banner for the docs — appears only after the reader has shown
 * investment (scroll-depth or dwell), never on arrival. Dismiss snoozes it for
 * 30 days; clicking through dismisses it for good. Follows the PostHog pattern.
 */
export function StarDocsBanner({ stars }: { stars: number }) {
  const plausible = usePlausible();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Respect a prior dismissal.
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (until && Date.now() < until) return;
    } catch {
      /* localStorage unavailable — just proceed */
    }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      cleanup();
      setVisible(true);
      plausible('star_banner_shown');
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const top = window.scrollY || doc.scrollTop || document.body.scrollTop || 0;
      const max = (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight;
      if (max > 0 && top / max >= SCROLL_TRIGGER) reveal();
    };
    const timer = window.setTimeout(reveal, TIME_TRIGGER_MS);
    // Capture phase so we also catch scroll on inner containers (some docs
    // layouts scroll a nested element rather than the window).
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });

    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
    }
    return cleanup;
    // plausible identity is stable; intentionally run once on mount.
  }, []);

  function snooze(reason: 'dismissed' | 'clicked') {
    try {
      // A click means "I starred" — snooze far longer than a dismiss.
      const ttl = reason === 'clicked' ? SNOOZE_MS * 12 : SNOOZE_MS;
      localStorage.setItem(DISMISS_KEY, String(Date.now() + ttl));
    } catch {
      /* noop */
    }
    plausible(reason === 'clicked' ? 'star_banner_clicked' : 'star_banner_dismissed');
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 200);
  }

  if (!visible) return null;

  return (
    <StarBanner
      stars={stars}
      leaving={leaving}
      title="Schematex is free, open source & zero-dependency."
      subtitle="If the docs helped, a star helps the next person find it."
      onStar={() => snooze('clicked')}
      onDismiss={() => snooze('dismissed')}
    />
  );
}
