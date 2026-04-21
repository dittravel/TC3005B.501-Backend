/**
 * E2E: POST /api/exchange-rate/clear-cache
 *
 * Verifies that the cache-clear endpoint now requires admin authentication.
 * Previously unauthenticated (Finding 2 — LOW severity).
 */
import { test, expect } from '@playwright/test';

test.describe('POST /api/exchange-rate/clear-cache', () => {
  let adminToken;

  test.beforeAll(async ({ request }) => {
    const resp = await request.post('/api/user/login', {
      data: {
        username: process.env.TEST_ADMIN_USER || 'admin',
        password: process.env.TEST_ADMIN_PASS || 'admin123',
      },
    });
    const body = await resp.json();
    adminToken = body.token;
  });

  test('returns 401 with no token', async ({ request }) => {
    const resp = await request.post('/api/exchange-rate/clear-cache');
    expect(resp.status()).toBe(401);
  });

  test('returns 403 with a non-admin token', async ({ request }) => {
    const loginResp = await request.post('/api/user/login', {
      data: {
        username: process.env.TEST_SOLICITANTE_USER || 'andres.gomez',
        password: process.env.TEST_SOLICITANTE_PASS || 'andres123',
      },
    });
    const { token } = await loginResp.json();

    const resp = await request.post('/api/exchange-rate/clear-cache', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('returns 200 with a valid admin token', async ({ request }) => {
    const resp = await request.post('/api/exchange-rate/clear-cache', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(resp.status()).toBe(200);
  });
});
