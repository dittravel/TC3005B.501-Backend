/**
 * Applicant Routes
 * 
 * This module defines the routes and role-based access control
 * for the "Solicitante" functionalities
 */

import express from "express";
import applicantController from "../controllers/applicantController.js";
import { validateId, validateTravelRequest, validateExpenseReceipts, validateInputs, validateDraftTravelRequest } from "../middleware/validation.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import { generalRateLimiter } from "../middleware/rateLimiters.js";

// Import multer for file uploads
// Ref: https://www.npmjs.com/package/multer
// It adds a files property to the request object, which contains the uploaded files
import multer from 'multer';
const upload = multer();

const router = express.Router();

router.use((req, res, next) => {
  next();
});

// Get applicant information by user ID
router.route("/:id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.getApplicantById);

// Get cost center information for a user by user ID
router.route("/get-cc/:user_id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.getCostCenterByUserId);

// Create a new travel request for a user by user ID
router.route("/create-travel-request/:user_id")
  .post(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateTravelRequest, validateInputs, applicantController.createTravelRequest);

// Edit an existing travel request for a user by user ID
router.route("/edit-travel-request/:user_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateTravelRequest, validateInputs, applicantController.editTravelRequest);

// Cancel a travel request by request ID
router.route("/cancel-travel-request/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.cancelTravelRequest);

// Create an expense validation for a travel request
router.route("/create-expense-validation")
  .post(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateExpenseReceipts, validateInputs, applicantController.createExpenseValidationHandler);

// Get pending travel requests for a user by user ID
router.route("/get-completed-requests/:user_id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.getCompletedRequests);

// Get a specific travel request for a user by user ID
router.route("/get-user-request/:user_id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador', 'Agencia de viajes']), validateId, validateInputs, applicantController.getApplicantRequest);

// Get all travel requests for a user by user ID
router.route("/get-user-requests/:user_id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador', 'Agencia de viajes']), validateId, validateInputs, applicantController.getApplicantRequests);

// Get expense validations for a travel request by user ID
router.route("/create-draft-travel-request/:user_id")
  .post(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateDraftTravelRequest, validateInputs, applicantController.createDraftTravelRequest);

// Confirm a draft travel request by user ID and request ID
router.route("/confirm-draft-travel-request/:user_id/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.confirmDraftTravelRequest);

// Send expense validation for a travel request by request ID
router.route("/send-expense-validation/:request_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.sendExpenseValidation);

// Delete a receipt by receipt ID
router.route("/delete-receipt/:receipt_id")
  .delete(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.deleteReceipt);

// Get a specific receipt by receipt ID
router.route("/get-receipt/:receipt_id")
  .get(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.getReceipt);

// Update receipt details by receipt ID
router.route("/update-receipt/:receipt_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.updateReceipt);

// Update a travel request status by request ID and status ID
router.route("/update-request-status/:request_id/:status_id")
  .put(generalRateLimiter, authenticateToken, authorizeRole(['Solicitante', 'Autorizador']), validateId, validateInputs, applicantController.updateRequestStatus);

// Create expense validation with files
router.route("/create-expense-with-files")
  .post(
    generalRateLimiter,
    authenticateToken,
    authorizeRole(['Solicitante', 'Autorizador']),
    upload.fields([
      { name: "pdf", maxCount: 1 }, // Allow one single file
      { name: "xml", maxCount: 1 }
    ]),
    applicantController.createExpenseWithFilesHandler
  );

export default router;
