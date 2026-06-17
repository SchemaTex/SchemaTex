'use client';

import { useEffect, useState } from 'react';
import { usePlausible } from 'next-plausible';
import { StarBanner } from '@/components/StarBanner';

const SEEN_KEY = 'schematex.pgNudge.seen';
const DELAY_MS = 6000; // let the "it rendered!" moment land before asking

/**
 * "Star us" banner on the dedicated playground — same bottom-center banner as
 * the docs, shown once per session a few seconds after a successful render
 * (the moment the user has just seen their diagram work). Dismiss or click and
 * it won't return this session.
 */
export function PlaygroundStarNudge({ stars, active }: { stars: number; active: boolean }) {
  const plausible = usePlausible();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!active) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      /* sessionStorage unavailable */
    }
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* noop */
      }
      setVisible(true);
      plausible('star_nudge_shown', { props: { source: 'playground' } });
    }, DELAY_MS);
    return () => window.clearTimeout(t);
    // `plausible` is stable; re-run only when `active` flips.
  }, [active]);

  function close(reason: 'dismissed' | 'clicked') {
    plausible(reason === 'clicked' ? 'star_click' : 'star_nudge_dismissed', {
      props: { source: 'playground' },
    });
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 200);
  }

  if (!visible) return null;

  return (
    <StarBanner
      stars={stars}
      leaving={leaving}
      title="Like what you just made? Schematex is free & open source."
      subtitle="A star helps other developers find it."
      onStar={() => close('clicked')}
      onDismiss={() => close('dismissed')}
    />
  );
}
