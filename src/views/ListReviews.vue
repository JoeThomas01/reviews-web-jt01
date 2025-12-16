<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import { useReviews } from '@/composables/use-reviews';
import ReviewCard from '@/components/ReviewCard.vue';
import AddReviewForm from '@/components/AddReviewForm.vue';

// Payload that the AddReviewForm emits for a new reservation
type CreateReservationPayload = {
  deviceId: string;
  userId: string;
  notes?: string;
};

// Device shape returned by DeviceLoans API
type Device = {
  id: string;
  deviceType: string;
  status: 'available' | 'reserved' | 'loaned';
};

// --- Auth0 state ---
const { isAuthenticated, isLoading } = useAuth0();

// --- Reservations state (still called "reviews" in the composable) ---
const { reviews, totalCount, loading, adding, error, fetchReviews, addReview } =
  useReviews();

const showForm = ref(false);
const formRef = ref<InstanceType<typeof AddReviewForm> | null>(null);
const successMessage = ref<string | null>(null);

// Only allow creating when signed in and Auth0 has finished loading
const canCreate = computed(() => isAuthenticated.value && !isLoading.value);

// --- Devices state (from DeviceLoans) ---
const devices = ref<Device[]>([]);
const devicesLoading = ref(false);
const devicesError = ref<string | null>(null);

// For now keep this hardcoded (we’ll env-var it later if you want)
const DEVICELOANS_API =
  'https://deviceloans-test-jt01b-func.azurewebsites.net/api';

const fetchDevices = async () => {
  devicesLoading.value = true;
  devicesError.value = null;

  try {
    const res = await fetch(`${DEVICELOANS_API}/devices`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // Expect an array of devices
    devices.value = Array.isArray(json) ? (json as Device[]) : [];
  } catch (e: any) {
    console.error('Failed to fetch devices:', e);
    devicesError.value = e?.message ?? String(e);
  } finally {
    devicesLoading.value = false;
  }
};

const availabilityLabel = (status: Device['status']) => {
  switch (status) {
    case 'available':
      return 'Available';
    case 'reserved':
      return 'Reserved';
    case 'loaned':
      return 'Loaned out';
    default:
      return 'Unknown';
  }
};

const handleToggleForm = () => {
  if (!canCreate.value) return;

  showForm.value = !showForm.value;
  successMessage.value = null;

  if (!showForm.value && formRef.value) {
    formRef.value.resetForm();
  }
};

const handleSubmit = async (payload: CreateReservationPayload) => {
  if (!canCreate.value) return;

  successMessage.value = null;

  // Shape matches what the backend expects: deviceId, userId, notes
  await addReview(payload as any);

  if (!error.value) {
    successMessage.value = 'Reservation created successfully!';
    showForm.value = false;

    if (formRef.value) {
      formRef.value.resetForm();
    }

    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  }
};

const handleCancel = () => {
  showForm.value = false;
  successMessage.value = null;

  if (formRef.value) {
    formRef.value.resetForm();
  }
};

onMounted(() => {
  fetchDevices();
  fetchReviews();
});
</script>

<template>
  <section class="page">
    <!-- ========================= -->
    <!-- Devices / Availability -->
    <!-- ========================= -->
    <section class="devices">
      <h1>Devices</h1>

      <div v-if="devicesLoading" class="state">Loading devices…</div>
      <div v-else-if="devicesError" class="state state--error">
        {{ devicesError }}
      </div>

      <ul v-else class="grid" role="list">
        <li v-for="d in devices" :key="d.id" class="grid__item device-card">
          <strong>{{ d.deviceType }}</strong>
          <span class="badge" :class="`badge--${d.status}`">
            {{ availabilityLabel(d.status) }}
          </span>
        </li>
      </ul>
    </section>

    <!-- ========================= -->
    <!-- Reservations -->
    <!-- ========================= -->
    <header class="page__header">
      <h1>Reservations</h1>

      <!-- Show "+ Add Reservation" only when user is signed in -->
      <button
        v-if="canCreate"
        @click="handleToggleForm"
        class="btn btn--add"
        :disabled="loading"
      >
        {{ showForm ? 'Cancel' : '+ Add Reservation' }}
      </button>
    </header>

    <!-- Hint when logged out -->
    <p v-if="!isLoading && !isAuthenticated" class="hint">
      Sign in to create a reservation.
    </p>

    <div v-if="!loading" class="page__meta" aria-live="polite">
      <span v-if="totalCount > 0">{{ totalCount }} total</span>
      <span v-else>None yet</span>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <!-- Add Reservation Form (only when signed in and toggled on) -->
    <AddReviewForm
      v-if="showForm && canCreate"
      ref="formRef"
      :is-submitting="adding"
      :error="error"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <div v-if="loading" class="state">Loading…</div>
    <div v-else-if="error" class="state state--error">{{ error }}</div>

    <div v-else>
      <ul v-if="reviews.length" class="grid" role="list">
        <li v-for="r in reviews" :key="r.id" class="grid__item">
          <ReviewCard :review="r" />
        </li>
      </ul>
      <p v-else class="state">No reservations yet. Be the first!</p>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
}

/* Devices section */
.devices {
  margin-bottom: 3rem;
}

.device-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Badges */
.badge {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
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

/* Header section */
.page__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.page__meta {
  color: #6b7280;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.hint {
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #6b7280;
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--add {
  background-color: #3b82f6;
  color: white;
}

.btn--add:hover:not(:disabled) {
  background-color: #2563eb;
}

/* Success */
.success-message {
  padding: 1rem;
  background-color: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 6px;
  color: #065f46;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Grid & state */
.grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.grid__item {
  display: block;
}

.state {
  color: #374151;
}

.state--error {
  color: #b91c1c;
}
</style>
