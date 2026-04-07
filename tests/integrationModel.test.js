import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import pool from '../database/config/db.js';
import { buildIntegrationModel } from '../models/integrationModel.js';

after(async () => {
  await pool.end();
});

test('getERPEmployees falls back to null reports_to when boss_id is missing in the schema', async () => {
  const queries = [];
  const fakeConnection = {
    async query(sql, params = []) {
      queries.push({ sql, params });

      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return [];
      }

      if (sql.includes('COUNT(*) AS total_count')) {
        return [{ total_count: 1 }];
      }

      return [
        {
          user_id: 1,
          user_name: 'admin',
          email: 'enc-email',
          phone_number: 'enc-phone',
          workstation: 'ADMIN-WS',
          boss_id: null,
          active: 1,
          creation_date: '2026-03-01T10:00:00.000Z',
          last_mod_date: '2026-03-20T12:00:00.000Z',
          role_name: 'Administrador',
          department_id: 6,
          department_name: 'Admin',
          costs_center: 'ADMIN',
        },
      ];
    },
    release() {},
  };

  const model = buildIntegrationModel({
    dbPool: {
      async getConnection() {
        return fakeConnection;
      },
    },
  });

  const result = await model.getERPEmployees({
    updated_since: null,
    department_id: null,
    active_only: true,
    limit: 50,
    offset: 0,
  });

  assert.equal(result.total_count, 1);
  assert.equal(result.rows.length, 1);
  assert.match(queries[1].sql, /NULL AS boss_id/);
});
