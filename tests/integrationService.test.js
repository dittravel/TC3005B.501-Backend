import assert from 'node:assert/strict';
import test, { after } from 'node:test';

import pool from '../database/config/db.js';
import { buildERPEmployeeService, normalizeERPEmployeeFilters } from '../services/integrationService.js';

after(async () => {
  await pool.end();
});

test('normalizeERPEmployeeFilters applies stable defaults', () => {
  const filters = normalizeERPEmployeeFilters({});

  assert.deepEqual(filters, {
    updated_since: null,
    department_id: null,
    active_only: true,
    limit: 50,
    offset: 0,
  });
});

test('normalizeERPEmployeeFilters preserves explicit false values from query-like input', () => {
  const filters = normalizeERPEmployeeFilters({
    active_only: 'false',
  });

  assert.equal(filters.active_only, false);
});

test('getERPEmployees maps current DB fields into the ERP contract', async () => {
  const service = buildERPEmployeeService({
    integrationModel: {
      async getERPEmployees(filters) {
        assert.deepEqual(filters, {
          updated_since: '2026-03-01T00:00:00.000Z',
          department_id: 6,
          active_only: false,
          limit: 10,
          offset: 5,
        });

        return {
          total_count: 12,
          rows: [
            {
              user_id: 21,
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
          ],
        };
      },
    },
    decryptor: (value) => `decrypted:${value}`,
  });

  const response = await service.getERPEmployees({
    updated_since: '2026-03-01T00:00:00.000Z',
    department_id: '6',
    active_only: false,
    limit: '10',
    offset: '5',
  });

  assert.equal(response.meta.count, 1);
  assert.equal(response.meta.total_count, 12);
  assert.equal(response.meta.has_more, true);
  assert.equal(response.data[0].employee_id, 21);
  assert.equal(response.data[0].email, 'decrypted:enc-email');
  assert.equal(response.data[0].phone_number, 'decrypted:enc-phone');
  assert.equal(response.data[0].department.cost_center, 'ADMIN');
  assert.equal(response.data[0].role.name, 'Administrador');
  assert.equal(response.data[0].reports_to.employee_id, null);
});
