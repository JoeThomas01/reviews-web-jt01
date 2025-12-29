import { describe, it, expect } from 'vitest';

function join(base: string, path: string) {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

const base = process.env.VITE_DEVICELOANS_BASE_URL;

describe('Integration: DeviceLoans API', () => {
  it('GET /devices returns 200 and an array', async () => {
    if (!base) throw new Error('VITE_DEVICELOANS_BASE_URL is not set');

    const url = join(base, 'devices');
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    expect(res.status).toBe(200);

    const body = await res.json();
    const data = Array.isArray(body) ? body : body?.data;

    expect(Array.isArray(data)).toBe(true);
  });
});
