import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, getSentryEnvironment, isSentryEnabled } from "./src/lib/sentry-runtime";

Sentry.init({
  dsn: getSentryDsn(),
  enabled: isSentryEnabled(),
  tracesSampleRate: 0.2,
  environment: getSentryEnvironment(),
});
