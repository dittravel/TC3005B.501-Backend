/**
 * Audit Log Model
 *
 * Data access for critical action logs.
 */

import pool from '../database/config/db.js';

function buildAuditFilters(filters) {
  const clauses = [];
  const params = [];

  if (filters.actor_user_id !== null) {
    clauses.push('al.actor_user_id = ?');
    params.push(filters.actor_user_id);
  }

  if (filters.action_type) {
    clauses.push('al.action_type = ?');
    params.push(filters.action_type);
  }

  if (filters.entity_type) {
    clauses.push('al.entity_type = ?');
    params.push(filters.entity_type);
  }

  if (filters.entity_id) {
    clauses.push('al.entity_id = ?');
    params.push(filters.entity_id);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildAuditLogModel({ dbPool = pool } = {}) {
  return {
    async createAuditLog(entry, connection = null) {
      const conn = connection || (await dbPool.getConnection());

      try {
        const result = await conn.query(
          `INSERT INTO Audit_Log (
             actor_user_id,
             action_type,
             entity_type,
             entity_id,
             source_ip,
             metadata
           ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            entry.actor_user_id,
            entry.action_type,
            entry.entity_type,
            entry.entity_id,
            entry.source_ip,
            entry.metadata,
          ]
        );

        return {
          audit_log_id: result.insertId,
        };
      } finally {
        if (!connection) conn.release();
      }
    },

    async getAuditLogs(filters) {
      let conn;

      try {
        conn = await dbPool.getConnection();
        const { whereClause, params } = buildAuditFilters(filters);

        const rows = await conn.query(
          `SELECT
             al.audit_log_id,
             al.actor_user_id,
             actor.user_name AS actor_user_name,
             al.action_type,
             al.entity_type,
             al.entity_id,
             al.source_ip,
             al.metadata,
             al.event_timestamp
           FROM Audit_Log al
           LEFT JOIN User actor
             ON actor.user_id = al.actor_user_id
           ${whereClause}
           ORDER BY al.event_timestamp DESC, al.audit_log_id DESC
           LIMIT ? OFFSET ?`,
          [...params, filters.limit, filters.offset]
        );

        const countRows = await conn.query(
          `SELECT COUNT(*) AS total_count
           FROM Audit_Log al
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

const AuditLogModel = buildAuditLogModel();

export { buildAuditLogModel };
export default AuditLogModel;
