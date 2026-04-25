import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev, 10% in prod
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session replay disabled — enable if needed later
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  debug: false,
});

// Capture App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
