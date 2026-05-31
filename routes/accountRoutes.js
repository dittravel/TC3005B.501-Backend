/**
 * Accounting Accounts Routes
 *
 * Endpoints for managing accounting accounts
 */

import express from 'express';
import * as accountController from '../controllers/accountController.js';
import { authenticateToken, authorizePermission, authorizeRole, validateSocietyAccess } from '../middleware/auth.js';
import { validateId, validateInputs } from '../middleware/validation.js';
import { generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/cost-centers')
  .get(
    generalRateLimiter,
    authenticateToken,
    accountController.getCostCenters
  );

router.route('/')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['accounts:view'], { mode: 'any' }),
    validateSocietyAccess('user'),
    accountController.getAccounts
  )
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['accounts:create'], { mode: 'any' }),
    validateSocietyAccess('user'),
    validateInputs,
    accountController.createAccount
  );

router.route('/:account_id')
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['accounts:view'], { mode: 'any' }),
    validateSocietyAccess('user'),
    validateId,
    validateInputs,
    accountController.getAccountById
  )
  .put(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['accounts:edit'], { mode: 'any' }),
    validateSocietyAccess('user'),
    validateId,
    validateInputs,
    accountController.updateAccount
  )
  .delete(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['accounts:delete'], { mode: 'any' }),
    validateSocietyAccess('user'),
    validateId,
    validateInputs,
    accountController.deleteAccount
  );

export default router;
