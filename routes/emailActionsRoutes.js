import express from 'express';
import { verifyToken } from '../services/email/emailTokenService.js';
import authorizerServices from '../services/authorizerService.js';
import AuditLogService from '../services/auditLogService.js';
import { sendEmails } from '../services/email/emailService.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.get('/:action/:token', generalRateLimiter, async (req, res) => {
  const { action, token } = req.params;

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      const frontendUrl = `${process.env.FRONTEND_URL}/resultado-accion-email?action=expired`;
      return res.redirect(frontendUrl);
    }

    const { requestId, userId, action: tokenAction } = decoded;

    if (action !== tokenAction) {
      const frontendUrl = `${process.env.FRONTEND_URL}/resultado-accion-email?action=expired`;
      return res.redirect(frontendUrl);
    }

    switch (action) {
      case 'approve': {
        if (decoded.role !== 'Autorizador') {
          const frontendUrl = `${process.env.FRONTEND_URL}/resultado-accion-email?action=unauthorized`;
          return res.redirect(frontendUrl);
        }

        try {
          const result = await authorizerServices.authorizeRequest(requestId, userId);

          const auditReq = {
            user: { user_id: userId },
            method: 'GET',
            originalUrl: `/api/email-actions/approve/${token}`,
            headers: req.headers || {}
          };

          await AuditLogService.recordAuditLogFromRequest(auditReq, {
            actionType: 'REQUEST_AUTHORIZED',
            entityType: 'Request',
            entityId: requestId,
            metadata: { new_status: result.new_status, source: 'email_action' },
          });

          try {
            await sendEmails(requestId);
          } catch (mailError) {
            console.error("Failed to send authorization notification email:", mailError);
          }

          const frontendUrl = `${process.env.FRONTEND_URL}/resultado-accion-email?action=approve&requestId=${requestId}&status=${encodeURIComponent(result.new_status)}`;
          return res.redirect(frontendUrl);
        } catch (err) {
          throw err;
        }
      }

      case 'decline': {
        if (decoded.role !== 'Autorizador') {
          const frontendUrl = `${process.env.FRONTEND_URL}/resultado-accion-email?action=unauthorized`;
          return res.redirect(frontendUrl);
        }

        try {
          const result = await authorizerServices.declineRequest(requestId, userId);

          const auditReq = {
            user: { user_id: userId },
            method: 'GET',
            originalUrl: `/api/email-actions/decline/${token}`,
            headers: req.headers || {}
          };

          await AuditLogService.recordAuditLogFromRequest(auditReq, {
            actionType: 'REQUEST_DECLINED',
            entityType: 'Request',
            entityId: requestId,
            metadata: { new_status: result.new_status, source: 'email_action' },
          });

          try {
            await sendEmails(requestId);
          } catch (mailError) {
            console.error("Failed to send decline notification email:", mailError);
          }

          const frontendUrl = `${process.env.FRONTEND_URL}/resultado-accion-email?action=decline&requestId=${requestId}&status=${encodeURIComponent(result.new_status)}`;
          return res.redirect(frontendUrl);
        } catch (err) {
          throw err;
        }
      }

      case 'view': {
        const frontendUrl = `${process.env.FRONTEND_URL}/detalles-solicitud/${requestId}`;
        return res.redirect(frontendUrl);
      }

      case 'view_receipts': {
        const frontendUrl = `${process.env.FRONTEND_URL}/comprobar-gastos/${requestId}`;
        return res.redirect(frontendUrl);
      }

      case 'upload_receipts': {
        const frontendUrl = `${process.env.FRONTEND_URL}/resubir-solicitud/${requestId}`;
        return res.redirect(frontendUrl);
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

  } catch (error) {
    console.error('Error handling email action:', error);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

export default router;
