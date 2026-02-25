/**
 * Admin Routes
 * 
 * This module defines the routes and role-based access control
 * for the "Administrador" functionalities
 */

import express from "express";
import multer from "multer";
import * as adminController from "../controllers/adminController.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import { validateCreateUser, validateInputs } from "../middleware/validation.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Multer used for handling file uploads
const upload = multer({
  dest: "uploads/"
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
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.updateUser);

// Delete a user by user ID
router.route("/delete-user/:user_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Administrador']), adminController.deactivateUser);

export default router;
