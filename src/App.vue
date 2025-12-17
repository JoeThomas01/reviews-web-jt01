<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useAuth0 } from '@auth0/auth0-vue';

const { isAuthenticated, isLoading, user, loginWithRedirect, logout } =
  useAuth0();

const handleLogin = async () => {
  await loginWithRedirect();
};

const handleLogout = () => {
  logout({ logoutParams: { returnTo: window.location.origin } });
};
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__left">
        <h1 class="topbar__title">DeviceLoans – Reservations</h1>
      </div>

      <div class="topbar__right">
        <span v-if="isLoading" class="topbar__status">Checking sign-in…</span>

        <template v-else>
          <div v-if="isAuthenticated" class="topbar__user">
            <span class="topbar__name">
              Signed in as {{ user?.name ?? user?.email ?? 'User' }}
            </span>
            <button
              type="button"
              class="btn btn--secondary"
              @click.prevent="handleLogout"
            >
              Sign out
            </button>
          </div>

          <div v-else>
            <button
              type="button"
              class="btn btn--primary"
              @click.prevent="handleLogin"
            >
              Sign in
            </button>
          </div>
        </template>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.topbar__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.topbar__status {
  font-size: 0.875rem;
  color: #6b7280;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.topbar__name {
  font-size: 0.875rem;
  color: #374151;
}

.btn {
  padding: 0.4rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn--primary {
  background: #2563eb;
  color: #ffffff;
}

.btn--primary:hover {
  background: #1d4ed8;
}

.btn--secondary {
  background: #f3f4f6;
  color: #111827;
}

.btn--secondary:hover {
  background: #e5e7eb;
}

.app-main {
  flex: 1;
  padding: 1.5rem 1rem;
}
</style>
