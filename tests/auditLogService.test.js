import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import pool from '../database/config/db.js';
import {
  buildAuditLogService,
  getClientIp,
  normalizeAuditLogFilters,
  sanitizeAuditMetadata,
} from '../services/auditLogService.js';

after(async () => {
  await pool.end();
});

test('sanitizeAuditMetadata removes sensitive keys recursively', () => {
  const sanitized = sanitizeAuditMetadata({
    email: 'hidden@example.com',
    password: 'secret',
    nested: {
      phone_number: '555-0000',
      safe: true,
    },
    array: [
      { token: 'jwt', safe: 'ok' },
    ],
  });

  assert.deepEqual(sanitized, {
    nested: {
      safe: true,
    },
    array: [
      { safe: 'ok' },
    ],
  });
});

test('normalizeAuditLogFilters applies stable defaults', () => {
  assert.deepEqual(normalizeAuditLogFilters({}), {
    actor_user_id: null,
    action_type: null,
    entity_type: null,
    entity_id: null,
    limit: 50,
    offset: 0,
    include_metadata: true,
  });
});

test('getClientIp prefers first forwarded IP and truncates safely', () => {
  const ip = getClientIp({
    headers: { 'x-forwarded-for': '10.0.0.1, 127.0.0.1' },
    ip: '::1',
  });

  assert.equal(ip, '10.0.0.1');
});

test('recordAuditLogFromRequest uses authenticated user and sanitized metadata', async () => {
  let capturedEntry = null;
  const service = buildAuditLogService({
    auditLogModel: {
      async createAuditLog(entry) {
        capturedEntry = entry;
        return { audit_log_id: 1 };
      },
      async getAuditLogs() {
        return { rows: [], total_count: 0 };
      },
    },
  });

  const result = await service.recordAuditLogFromRequest(
    {
      user: { user_id: 21 },
      headers: {},
      ip: '::1',
    },
    {
      actionType: 'USER_CREATED',
      entityType: 'User',
      entityId: 25,
      metadata: {
        user_name: 'jdoe',
        email: 'hidden@example.com',
      },
    }
  );

  assert.equal(result.audit_log_id, 1);
  assert.equal(capturedEntry.actor_user_id, 21);
  assert.equal(capturedEntry.source_ip, '::1');
  assert.equal(capturedEntry.entity_id, '25');
  assert.deepEqual(JSON.parse(capturedEntry.metadata), {
    user_name: 'jdoe',
  });
});
