'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

/**
 * Google Analytics 4 loader, gated behind cookie consent.
 *
 * Why gated: GA4 sets cookies and is subject to GDPR/ePrivacy, so it must NOT
 * load until the visitor opts in. Plausible (cookieless) stays always-on in the
 * layout <head> and is intentionally NOT gated here.
 *
 * Behaviour:
 * - First visit (no stored choice) → render the consent banner, GA stays off.
 * - "Accept"  → persist 'granted', mount gtag.js, set GA cookies from then on.
 * - "Decline" → persist 'denied', GA never loads.
 * - Returning visitor → read the stored choice, skip the banner, load GA only if granted.
 *
 * Dormant by default: with no NEXT_PUBLIC_GA_ID set, this renders the banner
 * only when a choice is pending — but never loads gtag — so wiring it up
 * before the env var is configured is a no-op on tracking.
 *
 * No Privacy Policy link: Schematex has no /privacy page, so linking one would
 * 404. Add the link back here if a privacy page ships.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const STORAGE_KEY = 'schematex_cookie_consent'; // 'granted' | 'denied'

type Consent = 'granted' | 'denied' | null;

export function CookieConsentGA() {
  const [consent, setConsent] = useState<Consent>(null);
  // `decided` starts true so the banner renders nothing on the server and the
  // first client paint — avoids a hydration mismatch and a flash of the banner.
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage blocked (privacy mode) — treat as undecided, never load GA.
    }
    if (stored === 'granted' || stored === 'denied') {
      setConsent(stored);
      setDecided(true);
    } else {
      setDecided(false);
    }
  }, []);

  function choose(value: Exclude<Consent, null>) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore — choice still applies for this session via state below
    }
    setConsent(value);
    setDecided(true);
  }

  return (
    <>
      {GA_ID && consent === 'granted' && (
        <>
          <Script
            src="/js/gtag.js"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { transport_url: location.origin });
            `}
          </Script>
        </>
      )}

      {!decided && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md flex-col gap-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--fill)] p-4 text-sm text-[color:var(--text)] shadow-lg sm:left-auto sm:right-4 sm:mx-0"
        >
          <p className="text-gray-600 dark:text-gray-400">
            We use cookies to analyze traffic and improve your experience.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => choose('denied')}
              className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => choose('granted')}
              className="rounded-lg bg-gray-900 px-3 py-1.5 font-medium text-white transition hover:opacity-90 dark:bg-gray-100 dark:text-gray-900"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
