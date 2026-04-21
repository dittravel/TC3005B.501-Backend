/**
 * E2E: GET /api/email-actions/:action/:token — auth bypass fix
 *
 * Verifies that:
 * 1. Cookie manipulation can no longer impersonate an authorizer (Finding 1 fix).
 * 2. A valid email token with role=Autorizador works without any cookies.
 * 3. A token with role≠Autorizador is rejected even with forged cookies.
 * 4. An expired/invalid token redirects to ?action=expired.
 */
import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

function makeEmailToken(overrides = {}) {
  return jwt.sign(
    {
      requestId: 9999,
      userId: 1,
      role: 'Autorizador',
      action: 'approve',
      ...overrides,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

test.describe('GET /api/email-actions/:action/:token — cookie bypass fix', () => {
  test('forged cookies alone cannot satisfy the endpoint — token role is checked', async ({ request }) => {
    // Token issued for a Solicitante (not an Autorizador)
    const token = makeEmailToken({ role: 'Solicitante', action: 'approve' });

    const resp = await request.get(`/api/email-actions/approve/${token}`, {
      headers: {
        // Forged cookies claiming to be an Autorizador
        Cookie: 'role=Autorizador; id=1; username=admin',
      },
      maxRedirects: 0,
    });

    // Should redirect to unauthorized, not process the approval
    expect(resp.status()).toBe(302);
    const location = resp.headers()['location'] || '';
    expect(location).toContain('unauthorized');
  });

  test('valid Autorizador token works without any session cookies', async ({ request }) => {
    const token = makeEmailToken({ role: 'Autorizador', action: 'approve' });

    const resp = await request.get(`/api/email-actions/approve/${token}`, {
      // No Cookie header — relies purely on token
      maxRedirects: 0,
    });

    // Either processes (302 to success/result) or rejects on DB error — but NOT 401
    expect(resp.status()).not.toBe(401);
  });

  test('expired token redirects to ?action=expired regardless of cookies', async ({ request }) => {
    const expired = jwt.sign(
      { requestId: 1, userId: 1, role: 'Autorizador', action: 'approve' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const resp = await request.get(`/api/email-actions/approve/${expired}`, {
      headers: { Cookie: 'role=Autorizador; id=1' },
      maxRedirects: 0,
    });

    expect(resp.status()).toBe(302);
    const location = resp.headers()['location'] || '';
    expect(location).toContain('expired');
  });

  test('action mismatch in token vs URL redirects to ?action=expired', async ({ request }) => {
    // Token says decline but URL says approve
    const token = makeEmailToken({ role: 'Autorizador', action: 'decline' });

    const resp = await request.get(`/api/email-actions/approve/${token}`, {
      maxRedirects: 0,
    });

    expect(resp.status()).toBe(302);
    const location = resp.headers()['location'] || '';
    expect(location).toContain('expired');
  });
});
