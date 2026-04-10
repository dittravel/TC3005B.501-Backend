/**
 * Integration Model
 *
 * Data access for integration-facing endpoints.
 */

import { prisma } from '../lib/prisma.js';

function buildEmployeeWhere(filters) {
  const where = {};
  if (filters.active_only) {
    where.active = true;
  }
  if (filters.department_id !== null && filters.department_id !== undefined) {
    where.department_id = filters.department_id;
  }
  if (filters.updated_since) {
    where.last_mod_date = { gte: filters.updated_since };
  }
  return where;
}

// Prisma introspection: assume boss_id is present if in schema
function hasBossIdField() {
  // If boss_id is in the Prisma schema, this returns true
  return 'boss_id' in prisma.user.fields;
}

// Not needed with Prisma ORM

function buildIntegrationModel() {
  return {
    /**
     * Get ERP Employees with filters, pagination, and joined info
     * @param {object} filters
     * @returns {object} { rows, total_count }
     */
    async getERPEmployees(filters) {
      const where = buildEmployeeWhere(filters);
      // Check if boss_id is present in the Prisma schema
      const includeBossId = true; // Set to true if boss_id is in your schema

      // Build select fields
      const select = {
        user_id: true,
        user_name: true,
        email: true,
        phone_number: true,
        workstation: true,
        active: true,
        creation_date: true,
        last_mod_date: true,
        role: { select: { role_name: true } },
        department: {
          select: {
            department_id: true,
            department_name: true,
            CostCenter: {
              select: {
                cost_center_name: true,
              },
            },
          },
        },
      };
      if (includeBossId) {
        select.boss_id = true;
      }

      const [rows, total_count] = await Promise.all([
        prisma.user.findMany({
          where,
          select,
          orderBy: { user_id: 'asc' },
          skip: filters.offset,
          take: filters.limit,
        }),
        prisma.user.count({ where }),
      ]);

      // Map to match legacy output (flatten role/department)
      const mappedRows = rows.map(row => ({
        user_id: row.user_id,
        user_name: row.user_name,
        email: row.email,
        phone_number: row.phone_number,
        workstation: row.workstation,
        boss_id: includeBossId ? row.boss_id : null,
        active: row.active,
        creation_date: row.creation_date,
        last_mod_date: row.last_mod_date,
        role_name: row.role?.role_name ?? null,
        department_id: row.department?.department_id ?? null,
        department_name: row.department?.department_name ?? null,
        costs_center: row.department?.CostCenter?.cost_center_name ?? null,
      }));

      return {
        rows: mappedRows,
        total_count,
      };
    },
  };
}

const IntegrationModel = buildIntegrationModel();

export { buildIntegrationModel };
export default IntegrationModel;
