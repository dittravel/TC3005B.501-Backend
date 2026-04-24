/**
 * Audit Log Controller
 *
 * Read-only handlers for audit trails.
 */

import AuditLogService from '../services/auditLogService.js';

export async function getAuditLogs(req, res) {
  try {
    const filters = { ...req.query, society_id: req.user.society_id };
    const response = await AuditLogService.getAuditLogs(filters);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default {
  getAuditLogs,
};
