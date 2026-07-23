'use client';

/**
 * Minimal UserSay client wrapper.
 *
 * UserSay is loaded from CDN once per page lifetime when a public key is
 * configured via NEXT_PUBLIC_USERSAY_KEY.  The `trigger` method is a safe
 * no-op in SSR, when the key is missing, or before the script fires — so
 * callers can always call it unconditionally after a business event.
 */

const SCRIPT_SRC = 'https://cdn.usersay.com/js/usersay.js';

let initPromise: Promise<void> | null = null;

function ensureInit(): void {
  if (typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_USERSAY_KEY;
  if (!key) return;
  if (initPromise) return;

  initPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      if (existing.dataset.usersayReady === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => {
        existing.dataset.usersayReady = 'true';
        resolve();
      });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      script.dataset.usersayReady = 'true';
      try {
        (window as any).UserSay?.init?.({ key });
      } catch {
        /* UserSay init failure is non-fatal — events silently drop. */
      }
      resolve();
    };
    script.onerror = () => {
      initPromise = null; // allow retry on next trigger
      resolve();
    };
    document.head.appendChild(script);
  });
}

export const UserSay = {
  /**
   * Fire a UserSay event. Safe to call unconditionally — no-ops when:
   *  - running on the server
   *  - NEXT_PUBLIC_USERSAY_KEY is not set
   *  - the UserSay script hasn't loaded yet
   */
  trigger(event: string, properties?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    ensureInit();
    try {
      (window as any).UserSay?.trigger?.(event, properties);
    } catch {
      /* non-fatal */
    }
  },
};
