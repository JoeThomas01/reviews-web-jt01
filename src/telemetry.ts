// src/telemetry.ts
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

let appInsights: ApplicationInsights | null = null;

export function initTelemetry(): void {
  const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING;
  const roleName = import.meta.env.VITE_APPINSIGHTS_ROLE_NAME;

  if (!connectionString) {
    console.warn(
      '[AI] disabled: set VITE_APPINSIGHTS_CONNECTION_STRING in .env.local / GitHub secrets',
    );
    return;
  }

  // IMPORTANT:
  // Avoid injecting correlation headers into Auth0 calls (this is what caused your CORS preflight failure).
  const auth0Domain = (import.meta.env.VITE_AUTH0_DOMAIN ?? '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      enableAutoRouteTracking: true,

      // ✅ Do NOT add correlation headers (Request-Id, traceparent etc) to cross-site requests
      // This prevents Auth0 /oauth/token preflight CORS failures.
      enableCorsCorrelation: false,

      // ✅ Extra safety: exclude Auth0 domain from correlation attempts anyway
      correlationHeaderExcludedDomains: auth0Domain ? [auth0Domain] : [],

      // Keep dependency collection enabled (this drives AppDependencies)
      disableAjaxTracking: false,
      disableFetchTracking: false,
    },
  });

  if (roleName) {
    appInsights.addTelemetryInitializer((envelope) => {
      envelope.tags = envelope.tags ?? {};
      envelope.tags['ai.cloud.role'] = roleName;
    });
  }

  appInsights.loadAppInsights();
}

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  appInsights?.trackEvent({ name }, properties as any);
}

export function trackException(
  error: unknown,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  const ex = error instanceof Error ? error : new Error(String(error));
  appInsights?.trackException({ exception: ex }, properties as any);
}
