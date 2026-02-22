<<<<<<< Updated upstream
/*
=======
/**
>>>>>>> Stashed changes
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
import { validateId, validateInputs, validateDeptStatus } from "../middleware/validation.js";
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { loginRateLimiter, generalRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Get user data by user ID
router.route("/get-user-data/:user_id")
    .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'N1', 'N2', 'Cuentas por pagar', 'Agencia de viajes', 'Administrador']), validateId, validateInputs, userController.getUserData);

// Login with username and password
router.route('/login')
    .post(loginRateLimiter, userController.login);

// Logout - Clears cookie on client side
router.route("/logout")
    .get(userController.logout);

// Get a specific travel request by request ID
router.route('/get-travel-request/:request_id')
    .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'N1', 'N2', 'Cuentas por pagar', 'Agencia de viajes']), validateId, validateInputs, userController.getTravelRequestById);

// Get travel requests by department ID and status ID, with optional limit
router.route('/get-travel-requests/:dept_id/:status_id/:n?')
    .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'N1', 'N2', 'Cuentas por pagar', 'Agencia de viajes']), validateDeptStatus, validateInputs, userController.getTravelRequestsByDeptStatus);

// Get user wallet information by user ID
router.route('/get-user-wallet/:user_id?')
    .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'N1', 'N2', 'Cuentas por pagar', 'Agencia de viajes']), validateId, validateInputs, userController.getUserWallet);

export default router;
