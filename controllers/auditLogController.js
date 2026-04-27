/**
 * Audit Log Controller
 *
 * Read-only handlers for audit trails.
 */

import AuditLogService from '../services/auditLogService.js';

export async function getAuditLogs(req, res) {
  try {
    const permissionKeys = Array.isArray(req.user?.permissions)
      ? req.user.permissions.map((permission) => String(permission).trim())
      : [];
    const canViewByGroup = permissionKeys.includes('superadmin:view_group_audit_log') || req.user?.role === 'Superadministrador';

    const requestedGroupId = req.query?.society_group_id ? Number(req.query.society_group_id) : null;
    const scopedFilters = {
      ...req.query,
      society_group_id: canViewByGroup
        ? requestedGroupId ?? req.user?.society_group_id ?? null
        : req.user?.society_group_id ?? null,
    };

    const response = await AuditLogService.getAuditLogs(scopedFilters);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default {
  getAuditLogs,
};
