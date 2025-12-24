// src/composables/use-reviews.ts
import { ref } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';

export type Reservation = {
  id: string;
  deviceId: string;
  userId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  errors?: string[];
};

const reservations = ref<Reservation[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const adding = ref(false);
const updating = ref(false);
const error = ref<string | null>(null);

// Base URL for Reservations API
const baseUrl = import.meta.env.VITE_REVIEWS_BASE_URL?.replace(/\/$/, '') ?? '';
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

function extractErrors(body: any): string | null {
  if (!body) return null;
  if (Array.isArray(body.errors) && body.errors.length)
    return body.errors.join('; ');
  if (typeof body.error === 'string' && body.error) return body.error;
  return null;
}

export function useReviews() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  async function getToken(requiredScope: string): Promise<string> {
    if (!isAuthenticated.value) {
      throw new Error('You must be signed in.');
    }

    return await getAccessTokenSilently({
      authorizationParams: {
        ...(audience ? { audience } : {}),
        scope: requiredScope,
      },
    });
  }

  async function fetchReviews() {
    if (!baseUrl) {
      error.value = 'VITE_REVIEWS_BASE_URL is not configured';
      reservations.value = [];
      totalCount.value = 0;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const res = await fetch(`${baseUrl}/reservations`, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const body = (await res.json()) as
        | ApiEnvelope<Reservation[]>
        | Reservation[];

      const data = Array.isArray(body)
        ? body
        : Array.isArray((body as any).data)
          ? (body as any).data
          : [];

      const maybeErr = Array.isArray(body) ? null : extractErrors(body);
      if (maybeErr) throw new Error(maybeErr);

      reservations.value = data;
      totalCount.value = data.length;
    } catch (e: any) {
      console.error('Failed to fetch reservations:', e);
      error.value = e?.message ?? String(e);
      reservations.value = [];
      totalCount.value = 0;
    } finally {
      loading.value = false;
    }
  }

  async function addReview(payload: {
    deviceId: string;
    userId: string; // UI still supplies it, backend should ignore and use token.sub
    notes?: string;
    startDate?: string;
    endDate?: string;
  }) {
    if (!baseUrl) {
      error.value = 'VITE_REVIEWS_BASE_URL is not configured';
      return;
    }

    adding.value = true;
    error.value = null;

    try {
      // Student permission
      const token = await getToken('reserve:devices');

      const res = await fetch(`${baseUrl}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }

      const body = (await res.json()) as ApiEnvelope<Reservation> | Reservation;

      const created =
        (body as any)?.data && typeof (body as any).data === 'object'
          ? ((body as any).data as Reservation)
          : (body as Reservation);

      const maybeErr = extractErrors(body);
      if (maybeErr) throw new Error(maybeErr);

      if (created && created.id) {
        reservations.value = [created, ...reservations.value];
        totalCount.value = reservations.value.length;
      }
    } catch (e: any) {
      console.error('Failed to create reservation:', e);
      error.value = e?.message ?? String(e);
    } finally {
      adding.value = false;
    }
  }

  async function collectReservation(resId: string) {
    if (!baseUrl) {
      error.value = 'VITE_REVIEWS_BASE_URL is not configured';
      return;
    }

    updating.value = true;
    error.value = null;

    try {
      // Staff permission
      const token = await getToken('manage:loans');

      const res = await fetch(
        `${baseUrl}/reservations/${encodeURIComponent(resId)}/collect`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }

      const body = (await res.json()) as ApiEnvelope<Reservation> | Reservation;

      const updated =
        (body as any)?.data && typeof (body as any).data === 'object'
          ? ((body as any).data as Reservation)
          : (body as Reservation);

      const maybeErr = extractErrors(body);
      if (maybeErr) throw new Error(maybeErr);

      reservations.value = reservations.value.map((r) =>
        r.id === updated.id ? updated : r,
      );
    } catch (e: any) {
      console.error('Failed to collect reservation:', e);
      error.value = e?.message ?? String(e);
    } finally {
      updating.value = false;
    }
  }

  async function returnReservation(resId: string) {
    if (!baseUrl) {
      error.value = 'VITE_REVIEWS_BASE_URL is not configured';
      return;
    }

    updating.value = true;
    error.value = null;

    try {
      // Staff permission
      const token = await getToken('manage:loans');

      const res = await fetch(
        `${baseUrl}/reservations/${encodeURIComponent(resId)}/return`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }

      const body = (await res.json()) as ApiEnvelope<Reservation> | Reservation;

      const updated =
        (body as any)?.data && typeof (body as any).data === 'object'
          ? ((body as any).data as Reservation)
          : (body as Reservation);

      const maybeErr = extractErrors(body);
      if (maybeErr) throw new Error(maybeErr);

      reservations.value = reservations.value.map((r) =>
        r.id === updated.id ? updated : r,
      );
    } catch (e: any) {
      console.error('Failed to return reservation:', e);
      error.value = e?.message ?? String(e);
    } finally {
      updating.value = false;
    }
  }

  return {
    reviews: reservations, // keep name so imports don’t break
    totalCount,
    loading,
    adding,
    updating,
    error,
    fetchReviews,
    addReview,
    collectReservation,
    returnReservation,
  };
}
