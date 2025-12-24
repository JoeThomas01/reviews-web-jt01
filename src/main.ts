// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createAuth0 } from '@auth0/auth0-vue';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { AjaxPlugin } from '@microsoft/applicationinsights-dependencies-js';

// --------------------
// App Insights (SPA) + Dependencies
// --------------------
const aiIkey = import.meta.env.VITE_APPINSIGHTS_IKEY as string | undefined;
const aiIngestion = import.meta.env.VITE_APPINSIGHTS_INGESTION as
  | string
  | undefined;

if (aiIkey && aiIngestion) {
  const endpointUrl = `${aiIngestion.replace(/\/+$/, '')}/v2/track`;

  // Dependency tracking (fetch/XHR)
  const ajaxPlugin = new AjaxPlugin();

  const appInsights = new ApplicationInsights({
    config: {
      instrumentationKey: aiIkey,
      endpointUrl,
      enableAutoRouteTracking: true,
      enableCorsCorrelation: true,

      // Hook the dependencies plugin in
      extensions: [ajaxPlugin],
      extensionConfig: {
        [ajaxPlugin.identifier]: {
          // Track fetch + xhr (covers most cases)
          disableFetchTracking: false,
          disableAjaxTracking: false,

          // Optional: include headers needed for correlation
          // (safe to leave on)
          distributedTracingMode: 1,
        },
      },
    },
  });

  appInsights.loadAppInsights();

  // Send something immediately so you can always query it
  appInsights.trackPageView();
  appInsights.trackEvent(
    { name: 'AppStarted' },
    { mode: import.meta.env.MODE },
  );

  (window as any).appInsights = appInsights;
} else {
  console.warn(
    '[AI] disabled: set VITE_APPINSIGHTS_IKEY and VITE_APPINSIGHTS_INGESTION in .env.local',
  );
}

// --------------------
// Auth0 (your existing setup)
// --------------------
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

if (!domain || !clientId) {
  console.warn(
    'Auth0 env vars are missing. Check VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID.',
  );
}

const app = createApp(App);

app.use(router);

const auth0 = createAuth0({
  domain: domain ?? '',
  clientId: clientId ?? '',
  authorizationParams: {
    redirect_uri: window.location.origin,
    ...(audience ? { audience } : {}),
    scope: 'openid profile email reserve:devices manage:loans',
  },
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
});

app.use(auth0);

(window as any).auth0 = auth0;

app.mount('#app');
