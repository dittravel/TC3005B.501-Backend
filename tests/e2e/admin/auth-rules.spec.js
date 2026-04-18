/**
 * E2E: Authorization rules endpoints
 *
 * Tests GET /api/admin/get-auth-rules and GET /api/admin/auth-rules/:id
 * end-to-end against a live server + DB.
 *
 * Covers:
 *   - Role protection: unauthenticated (401), wrong role (403), correct role (200)
 *   - Response shape: array with rule objects containing expected fields
 *   - Rule by ID: existing rule returns full object, unknown ID returns 404/null
 */
import { test, expect } from '../fixtures/auth.js';

test.describe('GET /api/admin/get-auth-rules', () => {
  test('returns 401 when no token is provided', async ({ request }) => {
    const resp = await request.get('/api/admin/get-auth-rules');
    expect(resp.status()).toBe(401);
  });

  test('returns 403 when called with a non-admin token', async ({ request, userToken }) => {
    const resp = await request.get('/api/admin/get-auth-rules', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('returns 200 and an array of rules for admin token', async ({ request, adminToken }) => {
    const resp = await request.get('/api/admin/get-auth-rules', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(resp.status()).toBe(200);
    const rules = await resp.json();
    expect(Array.isArray(rules)).toBe(true);
  });

  test('each rule has the expected shape', async ({ request, adminToken }) => {
    const resp = await request.get('/api/admin/get-auth-rules', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const rules = await resp.json();
    // Only validate shape when there are rules in the DB
    if (rules.length === 0) {
      test.skip();
      return;
    }

    const rule = rules[0];
    expect(rule).toHaveProperty('rule_id');
    expect(rule).toHaveProperty('is_default');
  });
});

test.describe('GET /api/admin/auth-rules/:rule_id', () => {
  test('returns 401 without token', async ({ request }) => {
    const resp = await request.get('/api/admin/auth-rules/1');
    expect(resp.status()).toBe(401);
  });

  test('returns 403 for non-admin role', async ({ request, userToken }) => {
    const resp = await request.get('/api/admin/auth-rules/1', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(resp.status()).toBe(403);
  });

  test('returns a rule object for a valid rule_id', async ({ request, adminToken }) => {
    // First get all rules to find a real ID
    const listResp = await request.get('/api/admin/get-auth-rules', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const rules = await listResp.json();

    if (rules.length === 0) {
      test.skip(); // No rules seeded — skip rather than fail
      return;
    }

    const ruleId = rules[0].rule_id;
    const resp = await request.get(`/api/admin/auth-rules/${ruleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.rule_id).toBe(ruleId);
  });

  test('returns 404 for a non-existent rule_id', async ({ request, adminToken }) => {
    const resp = await request.get('/api/admin/auth-rules/999999', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([404, 400]).toContain(resp.status());
  });
});

test.describe('Role protection matrix', () => {
  const protectedEndpoints = [
    { method: 'GET', path: '/api/admin/get-auth-rules' },
    { method: 'GET', path: '/api/admin/auth-rules/1' },
    { method: 'GET', path: '/api/admin/get-departments' },
    { method: 'GET', path: '/api/admin/get-roles' },
  ];

  for (const { method, path } of protectedEndpoints) {
    test(`${method} ${path} — rejects unauthenticated requests`, async ({ request }) => {
      const resp = method === 'GET'
        ? await request.get(path)
        : await request.post(path, { data: {} });
      expect(resp.status()).toBe(401);
    });
  }
});
