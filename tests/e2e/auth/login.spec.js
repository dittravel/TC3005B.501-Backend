/**
 * E2E: Login endpoint
 *
 * Tests the POST /api/user/login endpoint end-to-end against a live server + DB.
 * Covers: success path, invalid credentials, missing fields.
 */
import { test, expect } from '@playwright/test';

test.describe('POST /api/user/login', () => {
  test('returns 200 and a JWT token for valid admin credentials', async ({ request }) => {
    const resp = await request.post('/api/user/login', {
      data: {
        username: process.env.TEST_ADMIN_USER || 'admin',
        password: process.env.TEST_ADMIN_PASS || '123',
      },
    });

    expect(resp.status()).toBe(200);

    const body = await resp.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token.split('.')).toHaveLength(3); // valid JWT structure
    expect(body.role).toBe('Administrador');
  });

  test('returns 400 for wrong password', async ({ request }) => {
    const resp = await request.post('/api/user/login', {
      data: { username: 'admin', password: 'wrongpassword' },
    });

    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 400 for non-existent user', async ({ request }) => {
    const resp = await request.post('/api/user/login', {
      data: { username: 'ghost.user.xyz', password: '123' },
    });

    expect(resp.status()).toBe(400);
  });

  test('returns 400 when body is empty', async ({ request }) => {
    const resp = await request.post('/api/user/login', { data: {} });
    expect(resp.status()).toBe(400);
  });
});
