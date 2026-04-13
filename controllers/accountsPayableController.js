/**
* Accounts Payable Controller
* 
* This module handles business logic and financial processing operations
* for the "Cuentas por pagar" role. It manages expense validation,
* receipt processing, travel request approval, and financial oversight
* for the travel management system.
* 
* Role-based access control ensures only authorized accounts payable
* personnel can access financial data and approve expense validations.
*/

import AccountsPayable from "../models/accountsPayableModel.js";
import AccountsPayableService from '../services/accountsPayableService.js';
import RequestService from '../services/requestService.js';
import AuditLogService from "../services/auditLogService.js";
import ReimbursementPolicyService from "../services/reimbursementPolicyService.js";
import { sendEmails } from "../services/email/emailService.js";

// Process authorized travel requests and handle fee assignment
// Routes to travel agency if hotel/flight needed
const attendTravelRequest = async (req, res) => {
  const requestId = req.params.request_id;
  const imposedFee = req.body.imposed_fee;
  
  try {
    // Check if request exists
    const request = await AccountsPayable.requestExists(requestId);
    if (!request) {
      return res.status(404).json({ error: "Travel request not found" });
    }
    
    const current_status = request.request_status_id;
    
    // Validate if this request can be attended by accounts payable
    // Status 3 (Cotización del Viaje) -> Status 5 (Comprobación)
    if (current_status == 3){
      const new_status = 5;  // Transition to receipts validation

      // Use RequestService to update status, fee, and assign back to applicant
      await RequestService.updateRequest(
        requestId,
        {
          status_id: new_status,
          imposed_fee: imposedFee,
          assigned_to: request.user_id
        }
      );
      
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'REQUEST_QUOTED',
        entityType: 'Request',
        entityId: requestId,
        metadata: {
          imposed_fee: imposedFee,
          new_status,
        },
      });
      try {
        // Send email notifications
        await sendEmails(requestId);
      } catch (mailError) {
        console.error("Failed to send accounts payable quotation email:", mailError);
      }
      return res.status(200).json({
        message: "Travel request status updated successfully",
        requestId: requestId,
        imposedFee: imposedFee,
        newStatus: new_status,
      });
    }
    else{
      res.status(404).json({ error: "This request cannot be attended by accounts payable" });
    }
  } catch (err) {
    console.error("Error in attendTravelRequest controller:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Validate all receipts for a travel request and update status
const validateReceiptsHandler = async (req, res) => {
  const requestId = req.params.request_id;
  
  try {
    const result = await AccountsPayableService.validateReceiptsAndUpdateStatus(requestId);
    if (result.updatedStatus !== null) {
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'REQUEST_RECEIPTS_VALIDATED',
        entityType: 'Request',
        entityId: requestId,
        metadata: {
          updated_status: result.updatedStatus,
          message: result.message,
        },
      });
    }
    try {
      // Send email notifications
      await sendEmails(requestId);
    } catch (mailError) {
      console.error("Failed to send receipts validation email:", mailError);
    }
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in validateReceiptsHandler:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve or reject individual expense receipts
const validateReceipt = async (req, res) => {
  const receiptId = req.params.receipt_id;
  const approval = req.body.approval;
  // Only accept 'Aprobado' or 'Rechazado' as valid values
  if (approval !== "Aprobado" && approval !== "Rechazado") {
    return res.status(400).json({
      error: "Invalid input (only values 'Aprobado' or 'Rechazado' accepted for approval)"
    });
  }
  
  try {
    // Check if receipt exists
    const receipt = await AccountsPayable.receiptExists(receiptId);
    if (!receipt){
      return res.status(404).json({ error: "Receipt not found" });
    }
    
    // Check if the receipt was already validated
    if(receipt.validation != "Pendiente"){
      return res.status(404).json({ error: "Receipt already approved or rejected" });
    }

    // Enforce reimbursement policy before approving
    let policyWarnings = null;
    if (approval === "Aprobado") {
      try {
        const evaluation = await ReimbursementPolicyService.evaluateRequest(
          receipt.request_id,
          req.user
        );
        const receiptEval = evaluation.receipts.find(r => r.receipt_id === Number(receiptId));
        if (receiptEval) {
          if (receiptEval.evaluation_status === 'REJECTED') {
            return res.status(422).json({
              error: 'Receipt cannot be approved: policy violations detected',
              violations: receiptEval.violations,
            });
          }
          if (receiptEval.evaluation_status === 'WARNING') {
            policyWarnings = receiptEval.violations;
          }
        }
      } catch (policyError) {
        // 404 means no active policy is configured for this department — allow approval
        if (!policyError.status || policyError.status !== 404) {
          throw policyError;
        }
      }
    }

  const updated = await AccountsPayable.validateReceipt(receiptId, approval);

    if(!updated){
      return res
        .status(400)
        .json({ error: "Failed to update travel request status" });
    }

    if (approval === "Rechazado"){
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'RECEIPT_REJECTED',
        entityType: 'Receipt',
        entityId: receiptId,
        metadata: {
          new_status: 'Rechazado',
        },
      });
      return res.status(200).json({
        summary: "Receipt rejected",
        value: {
          receipt_id: receiptId,
          new_status: "Rechazado",
          message: "Receipt has been rejected." 
        }
      });
    }
    else if (approval === "Aprobado"){
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'RECEIPT_APPROVED',
        entityType: 'Receipt',
        entityId: receiptId,
        metadata: {
          new_status: 'Aprobado',
          policy_warnings: policyWarnings,
        },
      });
      return res.status(200).json({
        summary: "Receipt approved",
        value: {
          receipt_id: receiptId,
          new_status: "Aprobado",
          message: "Receipt has been approved.",
          ...(policyWarnings && { policy_warnings: policyWarnings }),
        }
      });
    }
    
  } catch (err) {
    console.error("Error in attendTravelRequest controller:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Search receipts across requests by applicant user_id, date range, and/or validation status
const searchReceipts = async (req, res) => {
  const { user_id, start_date, end_date, validation, limit, offset } = req.query;

  try {
    const result = await AccountsPayable.searchReceipts({
      userId: user_id,
      startDate: start_date,
      endDate: end_date,
      validation,
      societyId: req.user.society_id,
      limit,
      offset,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in searchReceipts controller:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get expense validation details for a specific travel request
const getExpenseValidations = async (req, res) => {
  const request_id = Number(req.params.request_id);
  
  console.log("Request ID:", request_id);
  
  try {
    // Check if request exists
    const exists = await AccountsPayable.requestExists(request_id);
    if (!exists) {
      return res.status(404).json({ error: "Travel request not found" });
    }
    
    // Get expense validations
    const validations = await AccountsPayable.getExpenseValidations(
      request_id
    );
    
    if (validations) {
      return res.status(200).json(validations);
    } else {
      return res
      .status(400)
      .json({ error: "Failed to retrieve expense validations" });
    }
  } catch (err) {
    console.error("Error in getExpenseValidations controller:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// exports for the router
export default {
  attendTravelRequest,
  validateReceiptsHandler,
  validateReceipt,
  getExpenseValidations,
  searchReceipts,
};
