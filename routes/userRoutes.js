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
import { validateId, validateInputs, validateDeptStatus, validateOutOfOffice } from "../middleware/validation.js";
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { loginRateLimiter, generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Get user data by user ID
router.route("/get-user-data/:user_id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador', 'Cuentas por pagar', 'Agencia de viajes', 'Administrador']), validateId, validateInputs, userController.getUserData);

// Login with username and password
router.route('/login')
  .post(loginRateLimiter, userController.login);

// Logout - Clears cookie on client side
router.route("/logout")
  .get(userController.logout);

// Get a specific travel request by request ID
router.route('/get-travel-request/:request_id')
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador', 'Cuentas por pagar', 'Agencia de viajes']), validateId, validateInputs, userController.getTravelRequestById);

// Get travel requests assigned to user by status ID, with optional limit
router.route('/get-travel-requests/:user_id/:status_id/:n?')
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador', 'Cuentas por pagar', 'Agencia de viajes']), validateDeptStatus, validateInputs, userController.getTravelRequestsByUserStatus);

// Get user wallet information by user ID
router.route('/get-user-wallet/:user_id?')
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador', 'Cuentas por pagar', 'Agencia de viajes']), validateId, validateInputs, userController.getUserWallet);

// Update user's out-of-office dates and substitute
router.route('/update-out-of-office/:user_id')
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Autorizador', 'Cuentas por pagar', 'Agencia de viajes', 'Administrador']), validateOutOfOffice, validateInputs, userController.updateOutOfOffice);

// Get list of users in the same department with the same role for substitution purposes
router.route('/get-substitute-users/:user_id')
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Autorizador', 'Cuentas por pagar', 'Agencia de viajes', 'Administrador']), validateId, validateInputs, userController.getSubstituteUsers);

export default router;
