import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, isSentryEnabled } from "@/lib/sentry-runtime";

// Client bundle: prefer explicit public mirror of deployment env when you want preview vs production in Sentry.
const clientEnvironment =
  process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
  process.env.NODE_ENV ||
  "development";

Sentry.init({
  dsn: getSentryDsn(),
  enabled: isSentryEnabled(),
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,
  environment: clientEnvironment,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
