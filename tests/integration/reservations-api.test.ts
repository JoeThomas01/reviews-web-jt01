import { describe, it, expect } from 'vitest';

function join(base: string, path: string) {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

const base = process.env.VITE_REVIEWS_BASE_URL;

describe('Integration: Reservations API', () => {
  it('GET /reservations returns 200 and an array', async () => {
    if (!base) throw new Error('VITE_REVIEWS_BASE_URL is not set');

    const url = join(base, 'reservations');
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    expect(res.status).toBe(200);

    const body = await res.json();
    const data = Array.isArray(body) ? body : body?.data;

    expect(Array.isArray(data)).toBe(true);
  });
});
