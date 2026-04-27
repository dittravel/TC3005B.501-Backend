/**
 * Audit Log Routes
 *
 * Read-only audit endpoints for administrators.
 */

import express from 'express';
import auditLogController from '../controllers/auditLogController.js';
import { authenticateToken, authorizePermission } from '../middleware/auth.js';
import { validateAuditLogQuery, validateInputs } from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/get-logs')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['system:audit_log', 'superadmin:view_group_audit_log'], { mode: 'any' }),
    validateAuditLogQuery,
    validateInputs,
    auditLogController.getAuditLogs
  );

export default router;
