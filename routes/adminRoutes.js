/**
 * Admin Routes
 * 
 * This module defines the routes and role-based access control
 * for the "Administrador" functionalities
 */

import express from "express";
import multer from "multer";
import * as adminController from "../controllers/adminController.js";
import { authenticateToken, authorizeRole, validateSocietyAccess } from "../middleware/auth.js";
import { validateCreateUser, validateInputs } from "../middleware/validation.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Multer used for handling file uploads (memory storage - no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

router.use((req, res, next) => {
  next();
});

// Get list of all users
router.route("/get-user-list")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.getUserList);

// Create a new user
router.route('/create-user')
  .post(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), validateCreateUser, validateInputs, adminController.createUser);

// Create multiple
// Expects a CSV file
router.route("/create-multiple-users")
  .post(
    generalRateLimiter,
    authenticateToken, authorizeRole(['Administrador']),
    upload.single("file"),
    adminController.createMultipleUsers
  );

// Update user information by user ID
router.route('/update-user/:user_id')
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), validateSocietyAccess('user'), adminController.updateUser);

// Delete a user by user ID
router.route("/delete-user/:user_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), validateSocietyAccess('user'), adminController.deactivateUser);

// Get departments
router.route("/get-departments")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.getDepartments);

// Get roles
router.route("/get-roles")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.getRoles);

// Get role details by ID
router.route('/roles/:role_id')
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.getRoleById);

// Create role
router.route('/create-role')
  .post(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.createRole);

// Update role
router.route('/update-role/:role_id')
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.updateRole);

// Delete role
router.route('/delete-role/:role_id')
  .delete(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.deleteRole);

// Get an auth rule by ID
router.route("/auth-rules/:rule_id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.getAuthRuleById);

// Get all auth rules
router.route("/get-auth-rules")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.getAuthRules);

// Create auth rule
router.route("/create-auth-rule")
  .post(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.createAuthRule);

// Update auth rule
router.route("/update-auth-rule/:rule_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.updateAuthRule);

// Delete auth rule
router.route("/delete-auth-rule/:rule_id")
  .delete(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.deleteAuthRule);

// Get boss list for a department
router.route("/get-boss-list/:department_id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.getBossList);

// Import data from XML/JSON file
router.route("/import-data")
  .post(
    generalRateLimiter,
    authenticateToken, authorizeRole(['Administrador']),
    upload.single("file"),
    adminController.importData
  );

export default router;
