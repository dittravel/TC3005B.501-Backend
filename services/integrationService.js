/**
 * Integration Service
 *
 * Business logic for integration-facing endpoints.
 */

import IntegrationModel from '../models/integrationModel.js';
import { decrypt } from '../middleware/decryption.js';

function normalizeBoolean(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return Boolean(value);
}

function normalizeERPEmployeeFilters(rawFilters = {}) {
  return {
    updated_since: rawFilters.updated_since ? new Date(rawFilters.updated_since).toISOString() : null,
    department_id:
      rawFilters.department_id === undefined || rawFilters.department_id === null
        ? null
        : Number(rawFilters.department_id),
    active_only: normalizeBoolean(rawFilters.active_only, true),
    limit: rawFilters.limit === undefined ? 50 : Number(rawFilters.limit),
    offset: rawFilters.offset === undefined ? 0 : Number(rawFilters.offset),
  };
}

function mapEmployeeRow(row, decryptor) {
  return {
    employee_id: row.user_id,
    username: row.user_name,
    email: decryptor(row.email),
    phone_number: decryptor(row.phone_number),
    workstation: row.workstation,
    role: {
      name: row.role_name,
    },
    department: {
      department_id: row.department_id,
      department_name: row.department_name,
      // The DB column is currently named `costs_center`; the contract normalizes it to `cost_center`.
      cost_center: row.costs_center,
    },
    reports_to: {
      employee_id: row.boss_id ?? null,
    },
    status: {
      active: Boolean(row.active),
    },
    audit: {
      created_at: row.creation_date ? new Date(row.creation_date).toISOString() : null,
      updated_at: row.last_mod_date ? new Date(row.last_mod_date).toISOString() : null,
    },
  };
}

function buildERPEmployeeService({
  integrationModel = IntegrationModel,
  decryptor = decrypt,
} = {}) {
  return {
    async getERPEmployees(rawFilters = {}) {
      const filters = normalizeERPEmployeeFilters(rawFilters);
      const result = await integrationModel.getERPEmployees(filters);
      const data = result.rows.map((row) => mapEmployeeRow(row, decryptor));

      return {
        data,
        meta: {
          count: data.length,
          total_count: result.total_count,
          has_more: filters.offset + data.length < result.total_count,
          filters,
        },
      };
    },
  };
}

const IntegrationService = buildERPEmployeeService();

export { buildERPEmployeeService, normalizeERPEmployeeFilters };
export default IntegrationService;
