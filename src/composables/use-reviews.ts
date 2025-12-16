// src/composables/use-reviews.ts
import { ref } from 'vue';

// Reservation-ish shape from your backend
type Reservation = {
  id: string;
  deviceId: string;
  userId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

// We keep the old name "useReviews" but this is really for reservations now.
const reviews = ref<Reservation[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const adding = ref(false);
const error = ref<string | null>(null);

// Base URL for your Reservations API, e.g.
// https://reservations-test-jt01-func.azurewebsites.net/api
const baseUrl = import.meta.env.VITE_REVIEWS_BASE_URL?.replace(/\/$/, '') ?? '';

async function fetchReviews() {
  if (!baseUrl) {
    error.value = 'VITE_REVIEWS_BASE_URL is not configured';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`${baseUrl}/reservations`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = (await response.json()) as Partial<ApiResponse<Reservation[]>>;

    const data = Array.isArray(json.data) ? json.data : [];
    reviews.value = data;
    totalCount.value = data.length;
  } catch (e: any) {
    console.error('Failed to fetch reservations:', e);
    error.value = e?.message ?? String(e);
  } finally {
    loading.value = false;
  }
}

async function addReview(payload: any) {
  if (!baseUrl) {
    error.value = 'VITE_REVIEWS_BASE_URL is not configured';
    return;
  }

  adding.value = true;
  error.value = null;

  try {
    const response = await fetch(`${baseUrl}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = (await response.json()) as Partial<ApiResponse<Reservation>>;

    const created = json.data;

    if (created) {
      // Put the new reservation at the top of the list
      reviews.value = [created, ...reviews.value];
      totalCount.value = reviews.value.length;
    }
  } catch (e: any) {
    console.error('Failed to create reservation:', e);
    error.value = e?.message ?? String(e);
  } finally {
    adding.value = false;
  }
}

export function useReviews() {
  return {
    reviews,
    totalCount,
    loading,
    adding,
    error,
    fetchReviews,
    addReview,
  };
}
