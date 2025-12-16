<script setup lang="ts">
import { computed } from 'vue';

// A "reservation-like" thing, with optional legacy review fields
type ReservationLike = {
  id: string;
  deviceId?: string;
  userId?: string;
  status?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  notes?: string;

  // legacy review fields — safe to keep for now
  title?: string;
  comment?: string;
  rating?: number;
};

const props = defineProps<{
  review: ReservationLike;
}>();

function formatDate(input?: string | Date): string | null {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

const hasReservationFields = computed(
  () =>
    !!props.review.deviceId ||
    !!props.review.userId ||
    !!props.review.status ||
    !!props.review.startDate ||
    !!props.review.endDate,
);

const deviceId = computed(() => props.review.deviceId ?? '(no device id)');
const userId = computed(() => props.review.userId ?? '(no user id)');
const status = computed(() => props.review.status ?? 'unknown');

const start = computed(() => formatDate(props.review.startDate));
const end = computed(() => formatDate(props.review.endDate));

const notes = computed(() => props.review.notes ?? props.review.comment ?? '');
</script>

<template>
  <article class="card">
    <header class="card__header">
      <!-- Reservation-style header -->
      <h2 v-if="hasReservationFields" class="card__title">
        Reservation – {{ deviceId }}
      </h2>

      <!-- Fallback: old review-style header -->
      <h2 v-else class="card__title">
        {{ review.title ?? 'Review' }}
      </h2>

      <p v-if="hasReservationFields" class="card__subtitle">
        User: <strong>{{ userId }}</strong>
        <span v-if="status" class="status-pill">{{ status }}</span>
      </p>

      <p v-else-if="review.rating != null" class="card__rating">
        Rating: {{ review.rating }} / 5
      </p>
    </header>

    <section class="card__body">
      <p v-if="hasReservationFields && (start || end)" class="card__dates">
        <span v-if="start">From: {{ start }}</span>
        <span v-if="end"> · To: {{ end }}</span>
      </p>

      <p v-if="notes" class="card__notes">
        {{ notes }}
      </p>

      <p
        v-else-if="!hasReservationFields && review.comment"
        class="card__notes"
      >
        {{ review.comment }}
      </p>
    </section>
  </article>
</template>

<style scoped>
.card {
  background: #ffffff;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.card__subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: #4b5563;
}

.status-pill {
  margin-left: 0.5rem;
  padding: 0.15rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #eff6ff;
  color: #1d4ed8;
}

.card__rating {
  margin: 0;
  font-size: 0.875rem;
  color: #f59e0b;
}

.card__body {
  margin-top: 0.25rem;
}

.card__dates {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.card__notes {
  margin: 0;
  font-size: 0.9rem;
  color: #374151;
  white-space: pre-line;
}
</style>
