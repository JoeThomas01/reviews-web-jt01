// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import { createAuth0 } from '@auth0/auth0-vue';

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

app.use(
  createAuth0({
    domain: domain ?? '',
    clientId: clientId ?? '',
    authorizationParams: {
      redirect_uri: window.location.origin,
      ...(audience ? { audience } : {}),
      // keep default scopes unless you KNOW your Auth0 API has reserve:devices set up
      // scope: 'openid profile email',
    },

    // ✅ reduces “refresh -> logged out” / callback state issues in dev + storage hosting
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  }),
);

app.mount('#app');
