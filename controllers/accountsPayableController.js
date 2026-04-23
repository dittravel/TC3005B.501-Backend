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
import User from "../models/userModel.js";
import AccountsPayableService from '../services/accountsPayableService.js';
import RequestService from '../services/requestService.js';
import RefundService from '../services/refundService.js';
import AuditLogService from "../services/auditLogService.js";
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

      // Deduct advance from user's wallet
      // -imposedFee because we want to reduce the 
      // wallet balance by the advance amount
      await User.updateWallet(request.user_id, -imposedFee);

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

    // Get request to retrieve user_id for refund processing
    const request = await AccountsPayable.requestExists(requestId);

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

      // Process refund when request is finalized
      if (request && request.user_id) {
        try {
          const refundResult = await RefundService.processRefund(requestId, request.user_id);
          result.refund = refundResult;

          // Log refund in audit
          await AuditLogService.recordAuditLogFromRequest(req, {
            actionType: 'Reembolso',
            entityType: 'Request',
            entityId: requestId,
            metadata: {
              refund_amount: refundResult.refundAmount,
              refund_type: refundResult.refundType,
              total_approved: refundResult.totalApproved,
            },
          });
        } catch (refundError) {
          console.error("Error processing refund:", refundError);
          // Continue even if refund fails, but log it
          result.refundError = refundError.message;
        }
      }
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
        },
      });
      return res.status(200).json({
        summary: "Receipt approved",
        value: {
          receipt_id: receiptId,
          new_status: "Aprobado",
          message: "Receipt has been approved.",
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

// Edit receipt amount
// for cases where receipt exceeds policy limits
const editReceiptAmount = async (req, res) => {
  const receiptId = req.params.receipt_id;
  const { new_amount } = req.body;

  // Check new amount is provided
  if (new_amount === undefined || new_amount === null) {
    return res.status(400).json({ error: "new_amount is required" });
  }

  // Validate new amount is a positive number
  const parsedAmount = parseFloat(new_amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: "new_amount must be a positive number" });
  }

  try {
    const receipt = await AccountsPayable.receiptExists(receiptId);
    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    if (receipt.validation !== "Pendiente") {
      return res.status(400).json({ error: "Cannot edit amount of already validated receipt" });
    }

    const updated = await AccountsPayable.updateReceiptAmount(receiptId, parsedAmount);

    if (!updated) {
      return res.status(400).json({ error: "Failed to update receipt amount" });
    }

    // Record audit log
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'RECEIPT_AMOUNT_EDITED',
      entityType: 'Receipt',
      entityId: receiptId,
      metadata: {
        old_amount: receipt.local_amount,
        new_amount: parsedAmount,
      },
    });

    res.status(200).json({
      message: "Receipt amount updated successfully",
      receipt_id: receiptId,
      new_amount: parsedAmount
    });
  } catch (err) {
    console.error("Error in editReceiptAmount controller:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Edit receipt notes
// for providing feedback on corrections needed
const editReceiptNotes = async (req, res) => {
  const receiptId = req.params.receipt_id;
  const { notes } = req.body;

  // Check notes field exists (can be empty string or null)
  if (notes === undefined) {
    return res.status(400).json({ error: "notes field is required" });
  }

  try {
    const receipt = await AccountsPayable.receiptExists(receiptId);
    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const updated = await AccountsPayable.updateReceiptNotes(receiptId, notes);

    if (!updated) {
      return res.status(400).json({ error: "Failed to update receipt notes" });
    }

    // Record audit log
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'RECEIPT_NOTES_EDITED',
      entityType: 'Receipt',
      entityId: receiptId,
      metadata: {
        old_notes: receipt.notes,
        new_notes: notes,
      },
    });

    res.status(200).json({
      message: "Receipt notes updated successfully",
      receipt_id: receiptId,
      new_notes: notes
    });
  } catch (err) {
    console.error("Error in editReceiptNotes controller:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Return receipts to request for correction
// marks request status as pending
const returnReceiptsForCorrection = async (req, res) => {
  const requestId = req.params.request_id;

  try {
    // Verify request exists
    const request = await AccountsPayable.requestExists(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Change request status from 6 (Validación de comprobantes)
    // to 5 (Comprobación gastos del viaje)
    await AccountsPayable.updateRequestStatus(requestId, 5);

    // Record audit log
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'RECEIPTS_RETURNED',
      entityType: 'Request',
      entityId: requestId.toString(),
      metadata: {
        previous_status_id: request.request_status_id,
        new_status_id: 5,
        reason: 'Receipts returned for correction'
      }
    });

    res.status(200).json({ message: "Receipts returned for correction successfully" });
  } catch (err) {
    console.error("Error in returnReceiptsForCorrection:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// exports for the router
export default {
  attendTravelRequest,
  validateReceiptsHandler,
  validateReceipt,
  editReceiptAmount,
  editReceiptNotes,
  getExpenseValidations,
  searchReceipts,
  returnReceiptsForCorrection,
};
