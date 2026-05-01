/**
 * Applicant Controller
 * 
 * This module handles business logic and operations for the "Solicitante" role.
 * It manages the complete travel request lifecycle including creation, editing,
 * cancellation, and expense validation for employees who apply for business travel.
 * 
 * Role-based access control ensures only authorized applicants and their
 * supervisors can access and modify travel request data.
 */
import Applicant from "../models/applicantModel.js";
import { cancelTravelRequestValidation, createExpenseValidationBatch, sendReceiptsForValidation } from '../services/applicantService.js';
import RefundPolicyService from '../services/refundPolicyService.js';
import { decrypt } from '../middleware/decryption.js';
import { sendEmails } from "../services/email/emailService.js";

// Get basic applicant information by ID
export const getApplicantById = async (req, res) => {
  const id = req.params.id;
  try {
    const applicant = await Applicant.findById(id);
    if (!applicant) {
      return res.status(404).json({ error: "Applicant not found" });
    }
    const applicantWithId = {
      user_id: applicant.user_id,
      user_name: applicant.user_name,
    };
    res.json(applicantWithId);
  } catch (err) {
    res.status(500).json({ error: "Controller: Internal Server Error" });
  }
};

// Get list of travel requests for a specific applicant
export const getApplicantRequests = async (req, res) => {
  const userId = req.params.user_id;
  try {
    const applicantRequests = await Applicant.getApplicantRequests(userId, req.user.society_id);

    if (!applicantRequests || applicantRequests.length === 0) {
      return res.status(404).json({ error: "No user requests found" });
    }

    const formattedRequests = applicantRequests.map((request) => ({
      request_id: request.request_id,
      destination_country: request.destination_country,
      beginning_date: formatDate(request.beginning_date),
      ending_date: formatDate(request.ending_date),
      creation_date: formatDate(request.creation_date),
      status: request.status,
      assigned_to_name: request.assigned_to_name,
    }));

    res.json(formattedRequests);
  } catch (err) {
    console.error("Error in getApplicantRequests controller:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get detailed travel request information with routes and user data
export const getApplicantRequest = async (req, res) => {
  const userId = req.params.user_id;
  try {
    const requestData = await Applicant.getApplicantRequest(userId);
    if (!requestData || requestData.length === 0) {
      return res.status(404).json({ error: "No user request found" });
    }

    // Get base data from first row (request details are same across all rows)
    const baseData = requestData[0];
    
    // Decrypt sensitive user information
    const decryptedEmail = decrypt(baseData.user_email);
    const decryptedPhone = decrypt(baseData.user_phone_number);

    // Build comprehensive response object
    const response = {
      request_id: baseData.request_id,
      request_status: baseData.request_status,
      notes: baseData.notes,
      requested_fee: baseData.requested_fee,
      imposed_fee: baseData.imposed_fee,
      request_days: baseData.request_days,
      creation_date: formatDate(baseData.creation_date),
      user: {
        user_name: baseData.user_name,
        user_email: decryptedEmail,
        user_phone_number: decryptedPhone,
      },
      // Map all rows to create routes array (each row represents one route)
      routes: requestData.map((row) => ({
        route_id: row.route_id,
        router_index: row.router_index,
        origin_country: row.origin_country,
        origin_city: row.origin_city,
        destination_country: row.destination_country,
        destination_city: row.destination_city,
        beginning_date: formatDate(row.beginning_date),
        beginning_time: row.beginning_time,
        ending_date: formatDate(row.ending_date),
        ending_time: row.ending_time,
        hotel_needed: row.hotel_needed,
        plane_needed: row.plane_needed,
      })),
    };

    res.json(response);
  } catch (err) {
    console.error("Error in getApplicantRequest controller:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get cost center information for a user
export const getCostCenterByUserId = async (req, res) => {
  const user_id = req.params.user_id;
  try {
    const costCenter = await Applicant.findCostCenterByUserId(user_id, req.user.society_group_id);
    if (!costCenter) {
      return res.status(404).json({
        error: `Cost center not found for user_id ${user_id}`,
        user_id,
      });
    }
    res.json(costCenter);
  } catch (err) {
    res.status(500).json({ error: "Controller: Internal Server Error" });
  }
};

// Create a new travel request and send notification email
export const createTravelRequest = async (req, res) => {
  const applicantId = Number(req.params.user_id);
  const travelDetails = req.body;
  try {
    const travelRequest = await Applicant.createTravelRequest(
      applicantId,
      travelDetails,
    );
    const requestId = travelRequest.requestId;

    // Send email notifications
    sendEmails(requestId);

    res.status(201).json(travelRequest);
  } catch (err) {
    console.error("Controller error:", err);
    res.status(500).json({ error: "Controller: Internal Server Error" });
  }
};

// Edit existing travel request details
export const editTravelRequest = async (req, res) => {
  const travelRequestId = Number(req.params.user_id);
  const travelDetails = req.body;
  try {
    const updatedTravelRequest = await Applicant.editTravelRequest(
      travelRequestId,
      travelDetails,
    );
    res.status(200).json(updatedTravelRequest);
  } catch (err) {
    console.error("Controller error:", err);
    res.status(500).json({ error: "Controller: Internal Server Error" });
  }
};

// Cancel a travel request and send notification
export const cancelTravelRequest = async (req, res) => {
  const { request_id } = req.params;

  try {
    const result = await cancelTravelRequestValidation(Number(request_id));
    
    // Send email notifications
    sendEmails(request_id);

    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Unexpected error in cancelTravelRequest controller:", err);
    return res.status(500).json({ error: "Unexpected error while cancelling request" });
  }
};

// Create expense validation batch from receipt data
export async function createExpenseValidationHandler(req, res) {
  try {
    const count = await createExpenseValidationBatch(req.body.receipts);
    return res.status(201).json({
      count,
      message: "Expense receipts created successfully",
    });
  } catch (err) {
    if (err.code === "BAD_REQUEST") {
      return res.status(400).json({ error: err.message });
    }
    console.error("Error in createExpenseValidationHandler:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get completed travel requests for a user
export const getCompletedRequests = async (req, res) => {
  // Validate and parse user ID parameter
  const userId = parseInt(req.params.user_id, 10);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const completedRequests = await Applicant.getCompletedRequests(userId, req.user.society_id);
    if (!completedRequests || completedRequests.length === 0) {
      return res.status(404).json({ error: "No completed requests found for the user" });
    }
    
    // Map database results to formatted response structure
    const formattedRequests = completedRequests.map(request => ({
      request_id: request.request_id,
      origin_country: request.origin_countries,
      destination_country: request.destination_countries,
      beginning_date: request.beginning_dates,
      ending_date: request.ending_dates,
      request_date: formatDate(request.creation_date),
      status: request.status
    }));
    res.json(formattedRequests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Create draft travel request (not submitted yet)
export const createDraftTravelRequest = async (req, res) => {
  const applicantId = Number(req.params.user_id);
  const travelDetails = req.body;
  try {
    const travelRequest = await Applicant.createDraftTravelRequest(
      applicantId,
      travelDetails,
    );
    res.status(201).json(travelRequest);

  } catch (error) {
    console.error("Error in createDraftTravelRequest controller:", error);
    res.status(500).json({ error: "Internal server error" });

  }
}

// Helper function to format dates
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
};

// Confirm and submit a draft travel request
export const confirmDraftTravelRequest = async (req, res) => {

  const userId = Number(req.params.user_id);
  const requestId = Number(req.params.request_id);

  try {
    const result = await Applicant.confirmDraftTravelRequest(userId, requestId);
    
    // Send email notifications
    sendEmails(requestId);

    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Unexpected error in confirmDraftTravelRequest controller:", err);
    return res.status(500).json({ error: "Unexpected error while confirming draft request" });
  }
};

// Send receipts for expense validation
export const sendExpenseValidation = async (req, res) => {
  const requestId = req.params.request_id;

  try {
    const result = await sendReceiptsForValidation(requestId);
    
    // Send email notifications
    sendEmails(requestId);

    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Unexpected error in sendExpenseValidation controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Delete receipt and associated files
export const deleteReceipt = async (req, res) => {
  const { receipt_id } = req.params;
  
  try {
    // Dynamically import the service to avoid circular dependencies
    const { deleteReceiptFiles } = await import('../services/receiptFileService.js');
    
    // Step 1: Delete associated files from MongoDB GridFS
    await deleteReceiptFiles(Number(receipt_id));
    
    // Step 2: Delete the receipt record from the main database
    await Applicant.deleteReceipt(Number(receipt_id));
    
    return res.status(200).json({
      message: "Receipt deleted successfully",
      receipt_id: Number(receipt_id)
    });
  } catch (err) {
    if (err.message === 'Receipt not found') {
      return res.status(404).json({ error: "Receipt not found" });
    }
    console.error("Error in deleteReceipt controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific receipt by ID
export const getReceipt = async (req, res) => {
  const { receipt_id } = req.params;
  
  try {
    const receipt = await Applicant.getReceipt(Number(receipt_id));
    
    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }
    
    return res.status(200).json(receipt);
  } catch (err) {
    console.error("Error in getReceipt controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Update receipt details
export const updateReceipt = async (req, res) => {
  const { receipt_id } = req.params;
  const { route_id, receipt_type_name, amount, currency, receipt_date, validation, local_amount } = req.body;

  try {
    // Validate required fields
    if (!route_id || !receipt_type_name || amount === undefined || !currency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updateData = {
      route_id,
      receipt_type_name,
      amount,
      local_amount: local_amount || amount,
      currency,
      receipt_date
    };

    if (validation) {
      updateData.validation = validation;
    }

    const updatedReceipt = await Applicant.updateReceipt(Number(receipt_id), updateData);

    if (!updatedReceipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    return res.status(200).json({
      message: "Receipt updated successfully",
      receipt: updatedReceipt
    });
  } catch (err) {
    console.error("Error in updateReceipt controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Update a travel request status
export const updateRequestStatus = async (req, res) => {
  const { request_id, status_id } = req.params;
  
  try {
    // Validate required fields
    if (!request_id || !status_id) {
      return res.status(400).json({ error: "Missing request_id or status_id" });
    }
    
    const parsedRequestId = Number(request_id);
    const parsedStatusId = Number(status_id);
    
    // Validate that status_id is a valid number
    if (isNaN(parsedStatusId) || parsedStatusId < 1 || parsedStatusId > 9) {
      return res.status(400).json({ error: "Invalid status_id. Must be between 1 and 9" });
    }
    
    await Applicant.updateRequestStatus(parsedRequestId, parsedStatusId);
    
    return res.status(200).json({
      message: "Request status updated successfully",
      request_id: parsedRequestId,
      new_status_id: parsedStatusId
    });
  } catch (err) {
    console.error("Error in updateRequestStatus controller:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Handler to create an expense with file uploads (PDF/XML)
// This is used to create a receipt along with uploading the associated files to MongoDB
export async function createExpenseWithFilesHandler(req, res) {
  try {
    // Check if files are present
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: "At least a PDF file is required" });
    }

    // Extract receipt details from request body
    const { receipt_type_id, request_id, route_id, amount, currency, receipt_date, local_amount } = req.body;

    // Validate required fields
    if (!receipt_type_id || !request_id || !route_id || amount === undefined || !currency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get society group ID to check refund policy
    const societyGroupId = req.user.society_group_id;
    const receiptLocalAmount = parseFloat(local_amount || amount);
    const parsedRequestId = Number(request_id);

    // Get active policy to check deadline
    const policy = await RefundPolicyService.getActivePolicy(societyGroupId);

    // Check submission deadline
    if (policy && policy.submission_deadline_days) {
      const requestData = await Applicant.getApplicantRequest(parsedRequestId);
      if (requestData) {
        const creationDate = new Date(requestData.creation_date);
        const deadlineDate = new Date(creationDate.getTime() + policy.submission_deadline_days * 24 * 60 * 60 * 1000);

        if (new Date() > deadlineDate) {
          return res.status(400).json({ error: `Deadline de presentación expirado. Límite: ${policy.submission_deadline_days} días desde la creación de la solicitud.` });
        }
      }
    }

    // Check if amount exceeds policy limits
    let exceedsLimit = false;
    if (policy) {
      if (receiptLocalAmount > policy.max_amount) {
        exceedsLimit = true;
      }
    }

    // Create the expense and upload files
    const result = await Applicant.createExpenseWithFiles({
      receipt_type_id: Number(receipt_type_id),
      request_id: Number(request_id),
      route_id: Number(route_id),
      amount: parseFloat(amount),
      local_amount: receiptLocalAmount,
      currency: currency,
      receipt_date: new Date(receipt_date),
      pdfFile: req.files.pdf[0],
      xmlFile: req.files.xml ? req.files.xml[0] : null, // Optional XML file
      exceeds_policy_limit: exceedsLimit
    });

    // Return message
    return res.status(201).json({
      message: "Expense created with files",
      receipt_id: result.receipt_id,
      pdf: result.pdf,
      xml: result.xml,
      cfdiData: result.cfdiData
    });

  } catch (err) {
    if (err.code === "DUPLICATE_UUID") {
      return res.status(409).json({ error: err.message });
    }
    // Unique constraint violation if XML file already exists
    if (err.code === "P2002" && err.meta?.modelName === 'Receipt') {
      return res.status(409).json({ error: "Este comprobante XML ya existe" });
    }
    if (err.code === "BAD_REQUEST") {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === "CONFLICT") {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get deadline status for a request — tells frontend if the submission window is still open
export const getDeadlineStatus = async (req, res) => {
  const requestId = Number(req.params.request_id);
  try {
    const status = await RefundPolicyService.getRequestDeadlineStatus(requestId);
    return res.status(200).json(status);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    console.error('Error in getDeadlineStatus controller:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getApplicantById,
  getApplicantRequests,
  getApplicantRequest,
  getCostCenterByUserId,
  createTravelRequest,
  editTravelRequest,
  cancelTravelRequest,
  getCompletedRequests,
  createExpenseValidationHandler,
  createDraftTravelRequest,
  confirmDraftTravelRequest,
  sendExpenseValidation,
  deleteReceipt,
  getReceipt,
  updateReceipt,
  updateRequestStatus,
  createExpenseWithFilesHandler,
  getDeadlineStatus,
};
