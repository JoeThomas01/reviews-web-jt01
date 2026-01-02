// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createAuth0 } from '@auth0/auth0-vue';

import { initTelemetry, trackEvent } from '@/telemetry';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

if (!domain || !clientId) {
  console.warn(
    'Auth0 env vars are missing. Check VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID.',
  );
}

// ✅ Telemetry as early as possible
initTelemetry();
trackEvent('AppStarted', { mode: import.meta.env.MODE });

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

app.mount('#app');
