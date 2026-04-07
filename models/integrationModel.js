/**
 * Integration Model
 *
 * Data access for integration-facing endpoints.
 */

import pool from '../database/config/db.js';

function buildEmployeeFilters(filters) {
  const clauses = [];
  const params = [];

  if (filters.active_only) {
    clauses.push('u.active = TRUE');
  }

  if (filters.department_id !== null) {
    clauses.push('u.department_id = ?');
    params.push(filters.department_id);
  }

  if (filters.updated_since) {
    clauses.push('u.last_mod_date >= ?');
    params.push(filters.updated_since);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

async function hasColumn(conn, tableName, columnName) {
  const result = await conn.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  return result.length > 0;
}

function buildEmployeeSelect({ includeBossId }) {
  const bossIdSelect = includeBossId ? 'u.boss_id' : 'NULL AS boss_id';

  return `SELECT
            u.user_id,
            u.user_name,
            u.email,
            u.phone_number,
            u.workstation,
            ${bossIdSelect},
            u.active,
            u.creation_date,
            u.last_mod_date,
            r.role_name,
            d.department_id,
            d.department_name,
            cc.cost_center_name AS cost_center_name
          FROM User u
          LEFT JOIN Role r
            ON r.role_id = u.role_id
          LEFT JOIN Department d
            ON d.department_id = u.department_id
          LEFT JOIN CostCenter cc
            ON cc.cost_center_id = d.cost_center_id`;
}

function buildIntegrationModel({
  dbPool = pool,
  columnInspector = hasColumn,
} = {}) {
  return {
    async getERPEmployees(filters) {
      let conn;

      try {
        conn = await dbPool.getConnection();
        const { whereClause, params } = buildEmployeeFilters(filters);
        const includeBossId = await columnInspector(conn, 'User', 'boss_id');
        const baseSelect = buildEmployeeSelect({ includeBossId });

        const rows = await conn.query(
          `${baseSelect}
           ${whereClause}
           ORDER BY u.user_id ASC
           LIMIT ? OFFSET ?`,
          [...params, filters.limit, filters.offset]
        );

        const countRows = await conn.query(
          `SELECT COUNT(*) AS total_count
           FROM User u
           ${whereClause}`,
          params
        );

        return {
          rows,
          total_count: Number(countRows[0]?.total_count || 0),
        };
      } finally {
        if (conn) conn.release();
      }
    },
  };
}

const IntegrationModel = buildIntegrationModel();

export { buildIntegrationModel };
export default IntegrationModel;
