<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import AddReviewForm from '@/components/AddReviewForm.vue';
import { useReviews, type Reservation } from '@/composables/use-reviews';

type Device = {
  id: string;
  label?: string;
  deviceType?: string;
  status?: string;
};

const {
  isAuthenticated,
  isLoading,
  loginWithRedirect,
  getAccessTokenSilently,
} = useAuth0();

const {
  reviews: reservations,
  totalCount,
  loading,
  adding,
  error,
  fetchReviews,
  addReview,
  collectReservation,
  returnReservation,
} = useReviews();

const showForm = ref(false);
const formRef = ref<InstanceType<typeof AddReviewForm> | null>(null);
const successMessage = ref<string | null>(null);
const actionBusyId = ref<string | null>(null);

const canCreate = computed(() => isAuthenticated.value && !isLoading.value);

// ---------------------------
// Staff capability: decode permissions[] from access token
// ---------------------------
const staffLoading = ref(false);
const permissions = ref<string[]>([]);
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

function decodeJwtPayload(token: string): any | null {
  const parts = token.split('.');
  const base64Url = parts.length >= 2 ? parts[1] : undefined;
  if (!base64Url) return null;

  // base64url -> base64
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  // Decode safely (handles UTF-8)
  const json = decodeURIComponent(
    Array.prototype.map
      .call(atob(base64), (c: string) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(''),
  );

  return JSON.parse(json);
}

async function refreshPermissions() {
  permissions.value = [];

  if (!isAuthenticated.value) return;

  staffLoading.value = true;
  try {
    // Get a token for the same API audience your app uses
    const token = await getAccessTokenSilently({
      authorizationParams: {
        ...(audience ? { audience } : {}),
      },
    });

    const payload = decodeJwtPayload(token);
    const perms = Array.isArray(payload?.permissions)
      ? payload.permissions
      : [];
    permissions.value = perms;
  } catch (e) {
    console.warn('Failed to read permissions from token:', e);
    permissions.value = [];
  } finally {
    staffLoading.value = false;
  }
}

const canManageLoans = computed(() =>
  permissions.value.includes('manage:loans'),
);

watch(
  () => isAuthenticated.value,
  async () => {
    await refreshPermissions();
  },
  { immediate: true },
);

// ---- Devices ----
const devices = ref<Device[]>([]);
const devicesLoading = ref(false);
const devicesError = ref<string | null>(null);

const deviceLoansBaseUrl =
  import.meta.env.VITE_DEVICELOANS_BASE_URL?.replace(/\/$/, '') ?? '';

function normaliseStatus(status?: string) {
  const s = (status ?? '').trim().toLowerCase();
  if (s === 'available') return 'available';
  if (s === 'reserved') return 'reserved';
  if (s === 'loaned' || s === 'loanedout' || s === 'loaned_out')
    return 'loaned';
  return 'unknown';
}

function availabilityLabel(norm: string) {
  if (norm === 'available') return 'Available';
  if (norm === 'reserved') return 'Reserved';
  if (norm === 'loaned') return 'Loaned out';
  return 'Unknown';
}

function isActiveReservation(r: Reservation): boolean {
  try {
    const now = Date.now();
    const start = r.startDate ? new Date(r.startDate).getTime() : now;
    const end = r.endDate ? new Date(r.endDate).getTime() : now;
    if (Number.isNaN(start) || Number.isNaN(end)) return true;
    return now >= start && now <= end;
  } catch {
    return true;
  }
}

function effectiveDeviceStatus(
  d: Device,
): 'available' | 'reserved' | 'loaned' | 'unknown' {
  const base = normaliseStatus(d.status);

  if (base === 'loaned') return 'loaned';

  const active = reservations.value.find(
    (r) => r.deviceId === d.id && isActiveReservation(r),
  );

  if (active) {
    const st = (active.status ?? '').toLowerCase();
    if (st === 'reserved') return 'reserved';
    if (st === 'collected') return 'loaned';
  }

  if (base === 'reserved') return 'reserved';
  if (base === 'available') return 'available';
  return 'unknown';
}

const deviceCounts = computed(() => {
  const counts = {
    total: devices.value.length,
    available: 0,
    reserved: 0,
    loaned: 0,
    unknown: 0,
  };
  for (const d of devices.value) {
    const s = effectiveDeviceStatus(d);
    counts[s] += 1;
  }
  return counts;
});

const fetchDevices = async () => {
  if (!deviceLoansBaseUrl) {
    devicesError.value = 'VITE_DEVICELOANS_BASE_URL is not configured';
    devices.value = [];
    return;
  }

  devicesLoading.value = true;
  devicesError.value = null;

  try {
    const res = await fetch(`${deviceLoansBaseUrl}/devices`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok)
      throw new Error(`DeviceLoans HTTP ${res.status} ${res.statusText}`);

    const json = await res.json();

    const data = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];

    devices.value = data as Device[];
  } catch (e: any) {
    console.error('Failed to fetch devices:', e);
    devicesError.value = e?.message ?? String(e);
    devices.value = [];
  } finally {
    devicesLoading.value = false;
  }
};

// ---- Form handlers ----
const handleToggleForm = () => {
  if (!canCreate.value) return;
  showForm.value = !showForm.value;
  successMessage.value = null;

  if (!showForm.value && formRef.value) {
    formRef.value.resetForm();
  }
};

const handleSubmit = async (payload: {
  deviceId: string;
  userId: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
}) => {
  if (!canCreate.value) return;

  successMessage.value = null;
  await addReview(payload);

  if (!error.value) {
    successMessage.value = 'Reservation created successfully!';
    showForm.value = false;
    formRef.value?.resetForm();

    await Promise.all([fetchReviews(), fetchDevices()]);

    setTimeout(() => (successMessage.value = null), 3000);
  }
};

const handleCancel = () => {
  showForm.value = false;
  successMessage.value = null;
  formRef.value?.resetForm();
};

async function handleCollect(r: Reservation) {
  if (!r?.id) return;
  if (!canManageLoans.value) return;

  actionBusyId.value = r.id;
  try {
    await collectReservation(r.id);
    await Promise.all([fetchReviews(), fetchDevices()]);
  } finally {
    actionBusyId.value = null;
  }
}

async function handleReturn(r: Reservation) {
  if (!r?.id) return;
  if (!canManageLoans.value) return;

  actionBusyId.value = r.id;
  try {
    await returnReservation(r.id);
    await Promise.all([fetchReviews(), fetchDevices()]);
  } finally {
    actionBusyId.value = null;
  }
}

function fmt(iso?: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

onMounted(async () => {
  await Promise.all([fetchDevices(), fetchReviews()]);
});
</script>

<template>
  <section class="page">
    <header class="page__header">
      <h1>Reservations</h1>

      <div class="actions">
        <button
          v-if="canCreate"
          @click="handleToggleForm"
          class="btn btn--add"
          :disabled="loading"
        >
          {{ showForm ? 'Cancel' : '+ Add Reservation' }}
        </button>

        <button v-else class="btn btn--secondary" @click="loginWithRedirect()">
          Sign in to reserve
        </button>
      </div>
    </header>

    <!-- Devices -->
    <section class="devices">
      <div class="devices__header">
        <h2>Devices</h2>
        <div class="devices__meta" v-if="devices.length">
          <span>{{ deviceCounts.total }} total</span>
          <span>• {{ deviceCounts.available }} available</span>
          <span>• {{ deviceCounts.reserved }} reserved</span>
          <span>• {{ deviceCounts.loaned }} loaned</span>
        </div>
      </div>

      <div v-if="devicesLoading" class="state">Loading devices…</div>
      <div v-else-if="devicesError" class="state state--error">
        {{ devicesError }}
      </div>
      <div v-else-if="!devices.length" class="state">
        No devices found in DeviceLoans yet.
      </div>

      <ul v-else class="grid" role="list">
        <li v-for="d in devices" :key="d.id" class="grid__item device-card">
          <div class="device-left">
            <strong>{{ d.label ?? d.id }}</strong>
            <div class="device-sub">{{ d.deviceType ?? 'Unknown type' }}</div>
            <div class="device-id">ID: {{ d.id }}</div>
          </div>

          <span class="badge" :class="`badge--${effectiveDeviceStatus(d)}`">
            {{ availabilityLabel(effectiveDeviceStatus(d)) }}
          </span>
        </li>
      </ul>
    </section>

    <!-- Meta -->
    <div v-if="!loading" class="page__meta" aria-live="polite">
      <span v-if="totalCount > 0">{{ totalCount }} total reservations</span>
      <span v-else>No reservations yet</span>

      <span v-if="isAuthenticated" style="margin-left: 10px; color: #6b7280">
        • Staff actions:
        <strong v-if="staffLoading">checking…</strong>
        <strong v-else>{{ canManageLoans ? 'enabled' : 'hidden' }}</strong>
      </span>
    </div>

    <!-- Success -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <!-- Add Reservation -->
    <AddReviewForm
      v-if="showForm && canCreate"
      ref="formRef"
      :is-submitting="adding"
      :error="error"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <!-- Reservations List -->
    <div v-if="loading" class="state">Loading reservations…</div>
    <div v-else-if="error" class="state state--error">{{ error }}</div>

    <div v-else>
      <div v-if="reservations.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>User</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
              <th>Notes</th>
              <th v-if="canManageLoans">Actions (staff)</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="r in reservations" :key="r.id">
              <td>
                <div class="cell-strong">{{ r.deviceId }}</div>
                <div class="cell-sub">ID: {{ r.id }}</div>
              </td>
              <td>{{ r.userId }}</td>
              <td>
                <span class="pill">{{
                  (r.status ?? 'unknown').toLowerCase()
                }}</span>
              </td>
              <td>{{ fmt(r.startDate) }}</td>
              <td>{{ fmt(r.endDate) }}</td>
              <td class="notes">{{ r.notes ?? '-' }}</td>

              <td v-if="canManageLoans">
                <div class="actions-col">
                  <button
                    class="btn-small"
                    :disabled="actionBusyId === r.id"
                    v-if="(r.status ?? '').toLowerCase() === 'reserved'"
                    @click="handleCollect(r)"
                  >
                    Collect
                  </button>

                  <button
                    class="btn-small"
                    :disabled="actionBusyId === r.id"
                    v-if="(r.status ?? '').toLowerCase() === 'collected'"
                    @click="handleReturn(r)"
                  >
                    Return
                  </button>

                  <span
                    v-if="
                      (r.status ?? '').toLowerCase() !== 'reserved' &&
                      (r.status ?? '').toLowerCase() !== 'collected'
                    "
                  >
                    -
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else class="state">No reservations yet.</p>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 980px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.page__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.devices {
  margin: 1.25rem 0 2rem;
}

.devices__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.devices__meta {
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.page__meta {
  color: #6b7280;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.btn {
  padding: 0.625rem 1.1rem;
  border: none;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--add {
  background: #3b82f6;
  color: #fff;
}

.btn--secondary {
  background: #f3f4f6;
  color: #111827;
}

.btn-small {
  padding: 0.35rem 0.6rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.actions-col {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.success-message {
  padding: 0.9rem 1rem;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 10px;
  color: #065f46;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.device-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.device-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.device-sub {
  font-size: 0.85rem;
  color: #374151;
}

.device-id {
  font-size: 0.8rem;
  color: #6b7280;
}

.badge {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.badge--available {
  background: #dcfce7;
  color: #166534;
}

.badge--reserved {
  background: #fef3c7;
  color: #92400e;
}

.badge--loaned {
  background: #fee2e2;
  color: #991b1b;
}

.badge--unknown {
  background: #e5e7eb;
  color: #374151;
}

.state {
  color: #374151;
}

.state--error {
  color: #b91c1c;
  white-space: pre-wrap;
}

.table-wrap {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.table th,
.table td {
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
}

.table th {
  font-size: 0.8rem;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cell-strong {
  font-weight: 700;
}

.cell-sub {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.15rem;
}

.pill {
  display: inline-block;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: #f3f4f6;
  color: #111827;
  font-size: 0.78rem;
  font-weight: 700;
}

.notes {
  max-width: 360px;
  white-space: normal;
  word-break: break-word;
}
</style>
