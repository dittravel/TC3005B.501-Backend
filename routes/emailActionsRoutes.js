/**
 * Email Actions Routes
 * 
 * Handles user actions triggered from email links.
 * Verifies tokens and processes actions like approving requests,
 * viewing request details, and viewing receipts.
 */

import express from 'express';
import { verifyToken } from '../services/email/emailTokenService.js';
import { authenticateTokenFromCookies } from '../middleware/auth.js';
import authorizerServices from '../services/authorizerService.js';
import AuditLogService from '../services/auditLogService.js';
import { sendEmails } from '../services/email/emailService.js';

const router = express.Router();

const normalizeFrontendBase = () => {
  try {
    const parsed = new URL(process.env.FRONTEND_URL || 'https://localhost:4321');
    return parsed.origin;
  } catch {
    return 'https://localhost:4321';
  }
};

const frontendBase = normalizeFrontendBase();

/**
 * Handle email action (approve, decline, view, etc.)
 * GET /email-actions/:action/:token
 * Requires user to be authenticated via cookies
 */
router.get('/:action/:token', authenticateTokenFromCookies, async (req, res) => {
  const { action, token } = req.params;

  try {
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      // Token is invalid or expired - redirect to result page
      const frontendUrl = `${frontendBase}/resultado-accion-email?action=expired`;
      return res.redirect(frontendUrl);
    }

    const { requestId, userId, action: tokenAction } = decoded;

    // Validate that action matches token
    if (action !== tokenAction) {
      // Action mismatch - redirect to result page
      const frontendUrl = `${frontendBase}/resultado-accion-email?action=expired`;
      return res.redirect(frontendUrl);
    }

    switch (action) {
      case 'approve': {
        // Only the assigned Autorizador can approve
        if (req.user.role !== 'Autorizador' || parseInt(req.user.user_id) !== parseInt(userId)) {
          console.warn(`Unauthorized approval attempt: user ${req.user.user_id} (role: ${req.user.role}) tried to approve as user ${userId}`);
          const frontendUrl = `${frontendBase}/resultado-accion-email?action=unauthorized`;
          return res.redirect(frontendUrl);
        }

        // Authorizer approves request
        try {
          const result = await authorizerServices.authorizeRequest(requestId, userId);
          
          // Create req-like object for audit logging
          const auditReq = {
            user: { user_id: userId },
            method: 'GET',
            originalUrl: `/api/email-actions/approve/${token}`,
            headers: req.headers || {}
          };
          
          await AuditLogService.recordAuditLogFromRequest(
            auditReq,
            {
              actionType: 'REQUEST_AUTHORIZED',
              entityType: 'Request',
              entityId: requestId,
              metadata: {
                new_status: result.new_status,
                source: 'email_action',
              },
            }
          );
          
          // Send email notifications to the newly assigned user
          try {
            await sendEmails(requestId);
          } catch (mailError) {
            console.error("Failed to send authorization notification email:", mailError);
            // Don't fail the request if email fails
          }
          
          // Redirect to success page
          const frontendUrl = `${frontendBase}/resultado-accion-email?action=approve&requestId=${requestId}&status=${encodeURIComponent(result.new_status)}`;
          return res.redirect(frontendUrl);
        } catch (err) {
          throw err;
        }
      }

      case 'decline': {
        // Only the assigned Autorizador can decline
        if (req.user.role !== 'Autorizador' || parseInt(req.user.user_id) !== parseInt(userId)) {
          console.warn(`Unauthorized decline attempt: user ${req.user.user_id} (role: ${req.user.role}) tried to decline as user ${userId}`);
          const frontendUrl = `${frontendBase}/resultado-accion-email?action=unauthorized`;
          return res.redirect(frontendUrl);
        }

        // Authorizer declines request
        try {
          const result = await authorizerServices.declineRequest(requestId, userId);
          
          // Create req-like object for audit logging
          const auditReq = {
            user: { user_id: userId },
            method: 'GET',
            originalUrl: `/api/email-actions/decline/${token}`,
            headers: req.headers || {}
          };
          
          await AuditLogService.recordAuditLogFromRequest(
            auditReq,
            {
              actionType: 'REQUEST_DECLINED',
              entityType: 'Request',
              entityId: requestId,
              metadata: {
                new_status: result.new_status,
                source: 'email_action',
              },
            }
          );
          
          // Send email notifications about the decline
          try {
            await sendEmails(requestId);
          } catch (mailError) {
            console.error("Failed to send decline notification email:", mailError);
            // Don't fail the request if email fails
          }
          
          // Redirect to success page
          const frontendUrl = `${frontendBase}/resultado-accion-email?action=decline&requestId=${requestId}&status=${encodeURIComponent(result.new_status)}`;
          return res.redirect(frontendUrl);
        } catch (err) {
          throw err;
        }
      }

      case 'view': {
        // Token is valid, redirect to request details page
        // Frontend will handle auth with existing cookies
        const frontendUrl = `${frontendBase}/detalles-solicitud/${requestId}`;
        return res.redirect(frontendUrl);
      }

      case 'view_receipts': {
        // Token is valid, redirect to receipts validation page
        const frontendUrl = `${frontendBase}/comprobar-gastos/${requestId}`;
        return res.redirect(frontendUrl);
      }

      case 'upload_receipts': {
        // Token is valid, redirect to upload receipts page
        const frontendUrl = `${frontendBase}/resubir-solicitud/${requestId}`;
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
