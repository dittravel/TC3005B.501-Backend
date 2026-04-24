/**
 * Audit Log Model
 *
 * Data access for critical action logs.
 */


import { prisma } from '../lib/prisma.js';

function buildAuditWhere(filters) {
  const where = {};
  if (filters.actor_user_id !== null && filters.actor_user_id !== undefined) {
    where.actor_user_id = filters.actor_user_id;
  }
  if (filters.society_id !== null && filters.society_id !== undefined) {
    where.society_id = filters.society_id;
  }
  if (filters.action_type) {
    where.action_type = filters.action_type;
  }
  if (filters.entity_type) {
    where.entity_type = filters.entity_type;
  }
  if (filters.entity_id) {
    where.entity_id = filters.entity_id;
  }
  return where;
}

function buildAuditLogModel() {
  return {
    // Create a new audit log entry
    async createAuditLog(entry) {
      const result = await prisma.audit_Log.create({
        data: {
          actor_user_id: entry.actor_user_id,
          society_id: entry.society_id,
          action_type: entry.action_type,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id,
          source_ip: entry.source_ip,
          metadata: entry.metadata,
        },
        select: { audit_log_id: true }
      });
      return result;
    },

    // Get audit logs with filters and pagination
    async getAuditLogs(filters) {
      const where = buildAuditWhere(filters);
      const [rows, total_count] = await Promise.all([
        prisma.audit_Log.findMany({
          where,
          include: {
            User: { select: { user_name: true } }
          },
          orderBy: [
            { event_timestamp: 'desc' },
            { audit_log_id: 'desc' }
          ],
          skip: filters.offset,
          take: filters.limit
        }),
        prisma.audit_Log.count({ where })
      ]);

      // Map user_name to actor_user_name for compatibility
      const mappedRows = rows.map(row => ({
        audit_log_id: row.audit_log_id,
        actor_user_id: row.actor_user_id,
        actor_user_name: row.User?.user_name ?? null,
        society_id: row.society_id,
        action_type: row.action_type,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        source_ip: row.source_ip,
        metadata: row.metadata,
        event_timestamp: row.event_timestamp
      }));

      return {
        rows: mappedRows,
        total_count
      };
    },
  };
}

const AuditLogModel = buildAuditLogModel();

export { buildAuditLogModel };
export default AuditLogModel;
