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
import mailData from "../services/email/mailData.js";
import { sendMail } from "../services/email/mail.cjs";

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
    if (current_status == 4){
      var new_status = 6;
      const hotel = request.hotel_needed_list;
      const plane = request.plane_needed_list;
      
      // If a hotel or plane is needed, send request to Travel Agency
      if (hotel.includes(1) || plane.includes(1)){
        new_status = 5;
      }
      
      const updated = await AccountsPayable.attendTravelRequest(requestId, imposedFee, new_status);
      
      if (updated) {
        const { user_email, user_name, request_id, status } = await mailData(requestId);
        await sendMail(user_email, user_name, requestId, status);
        return res.status(200).json({
          message: "Travel request status updated successfully",
          requestId: requestId,
          imposedFee: imposedFee,
          newStatus: new_status, 
        });
      } else {
        return res
        .status(400)
        .json({ error: "Failed to update travel request status" });
      } 
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
    const { user_email, user_name, request_id, status } = await mailData(requestId);
    await sendMail(user_email, user_name, requestId, status);
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
  
  if (approval !== 0 && approval !== 1) {
    return res.status(400).json({
      error: "Invalid input (only values 0 or 1 accepted for approval)"
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
    
    /**
     * Since the "rejected" state is 3 and the "approved" state
     * is 2, by subtracting the approval value (1 or 0) we can send
     * the desired value for the validation (3 for rejected or 2 for
     * approved 
     */
    const updated = await AccountsPayable.validateReceipt(receiptId, 3 - approval);
    
    if(!updated){
      return res
      .status(400)
      .json({ error: "Failed to update travel request status" });
    }
    
    if (approval == 0){
      return res.status(200).json({
        summary: "Receipt rejected",
        value: {
          receipt_id: receiptId,
          new_status: "Rechazado",
          message: "Receipt has been rejected." 
        }
      });
    }
    else if (approval == 1){
      return res.status(200).json({
        summary: "Receipt approved",
        value: {
          receipt_id: receiptId,
          new_status: "Aprobado",
          message: "Receipt has been approved." 
        }
      });
    }
    
  } catch (err) {
    console.error("Error in attendTravelRequest controller:", err);
    res.status(500).json({ error: "Internal Server Error" });
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
};
