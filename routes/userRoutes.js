/**
 * User Routes
 * 
 * This module defines the routes for user-related operations in the travel request system.
 * It includes routes for user authentication (login/logout), retrieving user data, 
 * and fetching travel requests and wallet information for users.
 * 
 * Role-based access control is implemented to ensure that only 
 * authorized users can access specific routes.
 */

import express from 'express';
import * as userController from '../controllers/userController.js';
import { validateId, validateInputs, validateDeptStatus, validateOutOfOffice, validateForgotPassword, validateResetPassword } from "../middleware/validation.js";
import { authenticateToken, authorizePermission, validateSocietyAccess } from '../middleware/auth.js';
import { loginRateLimiter, generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Get user data by user ID
router.route("/get-user-data/:user_id")
  .get(
    generalRateLimiter,
    authenticateToken,
    authorizePermission(['travel:view', 'users:view', 'users:edit'], { mode: 'any' }),
    validateSocietyAccess('user'),
    validateId,
    validateInputs,
    userController.getUserData,
  );

// Login with username and password
router.route('/login')
  .post(loginRateLimiter, userController.login);

// Request a password reset email
router.route('/forgot-password')
  .post(loginRateLimiter, validateForgotPassword, validateInputs, userController.forgotPassword);

// Reset password using a token received by email
router.route('/reset-password')
  .post(loginRateLimiter, validateResetPassword, validateInputs, userController.resetPassword);

// Logout - Clears cookie on client side
router.route("/logout")
  .get(userController.logout);

// Get a specific travel request by request ID
router.route('/get-travel-request/:request_id')
  .get(generalRateLimiter, authenticateToken, authorizePermission(['travel:view', 'travel:view_flights', 'travel:view_hotels', 'receipts:view'], { mode: 'any' }), validateSocietyAccess('request'), validateId, validateInputs, userController.getTravelRequestById);

// Get travel requests assigned to user by status ID, with optional limit
router.route('/get-travel-requests/:user_id/:status_id/:n?')
  .get(generalRateLimiter, authenticateToken, authorizePermission(['travel:view', 'travel:view_flights', 'travel:view_hotels', 'receipts:view'], { mode: 'any' }), validateSocietyAccess('user'), validateDeptStatus, validateInputs, userController.getTravelRequestsByUserStatus);

// Get user wallet information by user ID
router.route('/get-user-wallet/:user_id?')
  .get(generalRateLimiter, authenticateToken, authorizePermission(['users:view']), validateId, validateInputs, userController.getUserWallet);

// Update user's out-of-office dates and substitute
router.route('/update-out-of-office/:user_id')
  .put(generalRateLimiter, authenticateToken, authorizePermission(['travel:edit', 'receipts:edit'], { mode: 'any' }), validateSocietyAccess('user'), validateOutOfOffice, validateInputs, userController.updateOutOfOffice);

// Get list of users in the same department with the same role for substitution purposes
router.route('/get-substitute-users/:user_id')
  .get(generalRateLimiter, authenticateToken, authorizePermission(['users:view', 'travel:view'], { mode: 'any' }), validateSocietyAccess('user'), validateId, validateInputs, userController.getSubstituteUsers);

export default router;
