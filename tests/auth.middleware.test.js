/**
 * Unit tests for auth middleware (middleware/auth.js)
 *
 * Covers:
 *   - authenticateToken: missing token (401), invalid token (403), valid token (next())
 *   - authorizeRole: unauthorized role (403), authorized role (next())
 *   - authenticateTokenFromCookies: missing cookies (401), valid cookies (sets req.user)
 *   - requireDefaultAdmin: missing society_group_id (403), present (next())
 *
 * Deliberately not covered:
 *   - validateSocietyAccess — requires a live DB; covered by integration tests in CI
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

// lib/prisma.js calls dotenv.config({ override: true }) during import, which
// would overwrite any JWT_SECRET we set here. Import first, then override.
const {
  authenticateToken,
  authorizeRole,
  authenticateTokenFromCookies,
  requireDefaultAdmin,
} = await import('../middleware/auth.js');

// Override after import so dotenv's value is replaced for the test session
process.env.JWT_SECRET = TEST_SECRET;
process.env.ENFORCE_TOKEN_IP_BINDING = 'false';

// --- Helpers ---

function makeReq(overrides = {}) {
  return {
    headers: {},
    ip: '127.0.0.1',
    params: {},
    ...overrides,
  };
}

function makeRes() {
  const res = {};
  res.status = (code) => { res._status = code; return res; };
  res.json  = (body)  => { res._body  = body;  return res; };
  return res;
}

function makeToken(payload = {}) {
  return jwt.sign({ user_id: 1, role: 'Solicitante', ...payload }, TEST_SECRET);
}

// --- Tests ---

describe('authenticateToken', () => {
  it('responds 401 when no Authorization header is present', () => {
    const req = makeReq();
    const res = makeRes();

    authenticateToken(req, res, () => { throw new Error('next() must not be called'); });

    assert.equal(res._status, 401);
    assert.ok(res._body.error);
  });

  it('responds 403 when token is invalid', async () => {
    const req = makeReq({ headers: { authorization: 'Bearer bad.token.value' } });
    const res = makeRes();

    // next() is never called for invalid tokens; wait a tick for jwt.verify callback
    authenticateToken(req, res, () => { throw new Error('next() must not be called'); });
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(res._status, 403);
  });

  it('calls next() and sets req.user when token is valid', async () => {
    const token = makeToken({ user_id: 5, role: 'Autorizador' });
    const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
    const res = makeRes();

    await new Promise((resolve) => {
      authenticateToken(req, res, resolve);
    });

    assert.equal(req.user.user_id, 5);
    assert.equal(req.user.role, 'Autorizador');
  });
});

describe('authorizeRole', () => {
  it('responds 403 when user role is not in the allowed list', () => {
    const req = makeReq();
    req.user = { role: 'Solicitante' };
    const res = makeRes();

    authorizeRole(['Autorizador', 'Administrador'])(req, res, () => {
      throw new Error('next() must not be called');
    });

    assert.equal(res._status, 403);
  });

  it('calls next() when user role is in the allowed list', () => {
    const req = makeReq();
    req.user = { role: 'Administrador' };
    const res = makeRes();
    let called = false;

    authorizeRole(['Autorizador', 'Administrador'])(req, res, () => { called = true; });

    assert.ok(called);
  });

  it('responds 403 when req.user is missing entirely', () => {
    const req = makeReq();
    const res = makeRes();

    authorizeRole(['Administrador'])(req, res, () => {
      throw new Error('next() must not be called');
    });

    assert.equal(res._status, 403);
  });
});

describe('authenticateTokenFromCookies', () => {
  it('responds 401 when Cookie header is absent', () => {
    const req = makeReq();
    const res = makeRes();

    authenticateTokenFromCookies(req, res, () => {
      throw new Error('next() must not be called');
    });

    assert.equal(res._status, 401);
  });

  it('responds 401 when cookies are missing role or id', () => {
    const req = makeReq({ headers: { cookie: 'username=alice' } });
    const res = makeRes();

    authenticateTokenFromCookies(req, res, () => {
      throw new Error('next() must not be called');
    });

    assert.equal(res._status, 401);
  });

  it('sets req.user and calls next() with valid cookies', () => {
    const req = makeReq({
      headers: { cookie: 'role=Autorizador; id=7; username=alice' },
    });
    const res = makeRes();
    let called = false;

    authenticateTokenFromCookies(req, res, () => { called = true; });

    assert.ok(called);
    assert.equal(req.user.role, 'Autorizador');
    assert.equal(req.user.user_id, 7);
    assert.equal(req.user.username, 'alice');
  });
});

describe('requireDefaultAdmin', () => {
  it('responds 403 when req.user has no society_group_id', () => {
    const req = makeReq();
    req.user = { role: 'Administrador' };
    const res = makeRes();

    requireDefaultAdmin(req, res, () => {
      throw new Error('next() must not be called');
    });

    assert.equal(res._status, 403);
  });

  it('calls next() when req.user has a society_group_id', () => {
    const req = makeReq();
    req.user = { role: 'Administrador', society_group_id: 3 };
    const res = makeRes();
    let called = false;

    requireDefaultAdmin(req, res, () => { called = true; });

    assert.ok(called);
  });
});
