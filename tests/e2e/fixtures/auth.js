/**
 * Reusable authentication fixture for E2E tests.
 * Tokens are scoped to the worker so login is called once per worker,
 * not once per test — avoids hitting the login rate limiter.
 *
 * Credentials come from env vars:
 *   TEST_ADMIN_USER / TEST_ADMIN_PASS
 *   TEST_USER_USER  / TEST_USER_PASS
 */
import { test as base, expect, request as baseRequest } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || '3001'}`;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `E2E fixture: ${name} is not set. ` +
      'Set it via the TEST_* env vars (see .env.example). ' +
      'In CI these come from repository variables or the seed defaults.',
    );
  }
  return value;
}

async function loginAs(username, password) {
  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  try {
    const resp = await ctx.post('/api/user/login', { data: { username, password } });
    expect(resp.status(), `login as ${username} should succeed`).toBe(200);
    const body = await resp.json();
    return body.token;
  } finally {
    await ctx.dispose();
  }
}

export const test = base.extend({
  // scope: 'worker' — login runs once per worker process, token is reused across tests
  adminToken: [async ({ }, use) => {
    const token = await loginAs(requireEnv('TEST_ADMIN_USER'), requireEnv('TEST_ADMIN_PASS'));
    await use(token);
  }, { scope: 'worker' }],

  userToken: [async ({ }, use) => {
    const token = await loginAs(requireEnv('TEST_USER_USER'), requireEnv('TEST_USER_PASS'));
    await use(token);
  }, { scope: 'worker' }],
});

export { expect };
