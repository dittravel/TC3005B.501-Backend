/**
 * Reusable authentication fixture for E2E tests.
 * Extends the base Playwright test with pre-authenticated API contexts.
 *
 * Credentials come from env vars so CI and local dev can use different seeds:
 *   TEST_ADMIN_USER / TEST_ADMIN_PASS   (default: admin / 123)
 *   TEST_USER_USER  / TEST_USER_PASS   (default: diego.hernandez / 123)
 */
import { test as base, expect } from '@playwright/test';

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
      process.env.TEST_ADMIN_USER || 'admin',
      process.env.TEST_ADMIN_PASS || '123',
    );
    await use(token);
  },

  userToken: async ({ request }, use) => {
    const token = await loginAs(
      request,
      process.env.TEST_USER_USER || 'diego.hernandez',
      process.env.TEST_USER_PASS || '123',
    );
    await use(token);
  },
});

export { expect };
