/**
 * Audit Log Service
 *
 * Provides critical action logging and read-only audit retrieval.
 */

import AuditLogModel from '../models/auditLogModel.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'jwt',
  'authorization',
  'cookie',
  'card',
  'card_number',
  'cardnumber',
  'cvv',
  'pan',
  'email',
  'phone',
  'phone_number',
]);

function sanitizeAuditMetadata(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadata(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      if (!SENSITIVE_KEYS.has(String(key).toLowerCase())) {
        acc[key] = sanitizeAuditMetadata(nestedValue);
      }
      return acc;
    }, {});
  }

  return value;
}

function parseMetadata(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim().slice(0, 45);
  }

  return req.ip ? String(req.ip).slice(0, 45) : null;
}

function normalizeBoolean(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

function normalizeAuditLogFilters(rawFilters = {}) {
  return {
    society_group_id:
      rawFilters.society_group_id === undefined || rawFilters.society_group_id === null
        ? null
        : Number(rawFilters.society_group_id),
    actor_user_id:
      rawFilters.actor_user_id === undefined || rawFilters.actor_user_id === null
        ? null
        : Number(rawFilters.actor_user_id),
    action_type: rawFilters.action_type ? String(rawFilters.action_type).trim() : null,
    entity_type: rawFilters.entity_type ? String(rawFilters.entity_type).trim() : null,
    entity_id: rawFilters.entity_id ? String(rawFilters.entity_id).trim() : null,
    limit: rawFilters.limit === undefined ? 50 : Number(rawFilters.limit),
    offset: rawFilters.offset === undefined ? 0 : Number(rawFilters.offset),
    include_metadata: normalizeBoolean(rawFilters.include_metadata, true),
  };
}

function buildAuditLogService({ auditLogModel = AuditLogModel } = {}) {
  return {
    async recordAuditLog({
      actorUserId = null,
      actionType,
      entityType,
      entityId = null,
      sourceIp = null,
      metadata = null,
    }, options = {}) {
      const sanitizedMetadata = metadata ? sanitizeAuditMetadata(metadata) : null;

      return auditLogModel.createAuditLog({
        actor_user_id: actorUserId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId === null || entityId === undefined ? null : String(entityId),
        source_ip: sourceIp ? String(sourceIp).slice(0, 45) : null,
        metadata: sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : null,
      }, options.connection);
    },

    async recordAuditLogFromRequest(req, event, options = {}) {
      return this.recordAuditLog({
        actorUserId: req.user?.user_id ?? null,
        sourceIp: getClientIp(req),
        ...event,
      }, options);
    },

    async getAuditLogs(rawFilters = {}) {
      const filters = normalizeAuditLogFilters(rawFilters);
      const result = await auditLogModel.getAuditLogs(filters);
      const data = result.rows.map((row) => ({
        audit_log_id: row.audit_log_id,
        actor_user_id: row.actor_user_id,
        actor_user_name: row.actor_user_name || null,
        action_type: row.action_type,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        source_ip: row.source_ip,
        metadata: filters.include_metadata ? parseMetadata(row.metadata) : null,
        event_timestamp: row.event_timestamp
          ? new Date(row.event_timestamp).toISOString()
          : null,
      }));

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

const AuditLogService = buildAuditLogService();

export {
  buildAuditLogService,
  getClientIp,
  normalizeAuditLogFilters,
  sanitizeAuditMetadata,
};
export default AuditLogService;
