/**
 * Reusable authentication fixture for E2E tests.
 * Extends the base Playwright test with pre-authenticated API contexts.
 *
 * Credentials come from env vars so CI and local dev can use different seeds:
 *   TEST_ADMIN_USER / TEST_ADMIN_PASS   (default: admin / 123)
 *   TEST_USER_USER  / TEST_USER_PASS   (default: diego.hernandez / 123)
 */
import { test as base, expect } from '@playwright/test';

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

async function loginAs(request, username, password) {
  const resp = await request.post('/api/user/login', {
    data: { username, password },
  });
  expect(resp.status(), `login as ${username} should succeed`).toBe(200);
  const body = await resp.json();
  return body.token;
}

export const test = base.extend({
  adminToken: async ({ request }, use) => {
    const token = await loginAs(
      request,
      requireEnv('TEST_ADMIN_USER'),
      requireEnv('TEST_ADMIN_PASS'),
    );
    await use(token);
  },

  userToken: async ({ request }, use) => {
    const token = await loginAs(
      request,
      requireEnv('TEST_USER_USER'),
      requireEnv('TEST_USER_PASS'),
    );
    await use(token);
  },
});

export { expect };
