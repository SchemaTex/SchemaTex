'use client';

import PlausibleProvider from 'next-plausible';

// PlausibleProvider picks up `next_plausible_proxy=true` from the env var
// auto-injected by withPlausibleProxy() in next.config.mjs and uses the
// same-origin /proxy/api/event + /js/script*.js paths.
export function PlausibleAnalytics() {
  return (
    <PlausibleProvider
      domain="schematex.js.org"
      customDomain="https://plausible.ideamarketfit.com"
      selfHosted={true}
      trackOutboundLinks={true}
      trackFileDownloads={true}
      taggedEvents={true}
    />
  );
}
