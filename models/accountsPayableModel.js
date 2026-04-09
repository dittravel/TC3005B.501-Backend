/**
  * Accounts Payable Model
  * 
  * This module defines the data access layer for accounts payable operations,
  * including updating travel request statuses, validating receipts, and
  * retrieving expense validations.
  */

import { prisma } from "../lib/prisma.js";

const AccountsPayable = {
  // Update request status to Atención Agencia de Viajes
  async attendTravelRequest(requestId, imposedFee, new_status, connection = null) {
    try {
      const result = await prisma.request.updateMany({
        where: { request_id: requestId },
        data: { request_status_id: new_status, imposed_fee: imposedFee },
      });
      return result.count > 0;
    } catch (error) {
      console.error("Error updating travel request status:", error);
      throw error;
    }
  },
  
  // Check if request exists in the database and return its details
  async requestExists(requestId) {
    // Prisma cannot query views, so fallback to Request table
    const req = await prisma.request.findUnique({
      where: { request_id: requestId },
      select: {
        request_id: true,
        request_status_id: true,
        user_id: true,
        // hotel_needed_list and plane_needed_list are not available unless mapped in schema
      },
    });
    return req;
  },
  
  // Get the validation status of all receipts associated with a request
  async getReceiptStatusesForRequest(requestId) {
    const receipts = await prisma.receipt.findMany({
      where: { request_id: requestId },
      select: { validation: true },
    });
    return receipts.map(r => r.validation);
  },
  
  async updateRequestStatus(requestId, statusId, connection = null) {
    try {
      await prisma.request.updateMany({
        where: { request_id: requestId },
        data: { request_status_id: statusId },
      });
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  },
  
  // Check if a receipt exists in the database and return its details
  async receiptExists(receiptId) {
    return prisma.receipt.findUnique({
      where: { receipt_id: receiptId },
      select: {
        receipt_id: true,
        request_id: true,
        validation: true,
      },
    });
  },
  
  // Accept or Reject a Travel Request
  async validateReceipt(receiptId, approval, connection = null) {
    // Map approval (number or string) to Receipt_validation enum string
    const validationMap = ["Pendiente", "Aprobado", "Rechazado"];
    let validationValue = approval;
    if (typeof approval === "number") {
      validationValue = validationMap[approval] || "Pendiente";
    }
    const result = await prisma.receipt.updateMany({
      where: { receipt_id: receiptId },
      data: { validation: validationValue },
    });
    return result.count > 0;
  },
  
  // Search receipts across all requests with optional filters
  async searchReceipts({ userId, startDate, endDate, validation, limit = 50, offset = 0 } = {}) {
    // Build Prisma where clause
    const where = {};
    if (startDate || endDate || validation || userId) {
      where.AND = [];
      if (userId) {
        where.AND.push({ request: { user_id: userId } });
      }
      if (startDate) {
        where.AND.push({ submission_date: { gte: startDate } });
      }
      if (endDate) {
        where.AND.push({ submission_date: { lte: endDate } });
      }
      if (validation) {
        where.AND.push({ validation });
      }
    }
    const [receipts, total_count] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          receipt_type: { select: { receipt_type_name: true } },
          request: { include: { user: { select: { user_id: true, user_name: true } } } },
        },
        orderBy: { submission_date: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.receipt.count({ where }),
    ]);
    return {
      total_count,
      limit,
      offset,
      receipts: receipts.map(row => ({
        receipt_id: row.receipt_id,
        request_id: row.request_id,
        route_id: row.route_id,
        receipt_type_name: row.receipt_type?.receipt_type_name ?? null,
        amount: row.amount,
        currency: row.currency,
        validation: row.validation,
        submission_date: row.submission_date,
        applicant_user_id: row.request?.user?.user_id ?? null,
        applicant_user_name: row.request?.user?.user_name ?? null,
        pdf_id: row.pdf_file_id,
        pdf_name: row.pdf_file_name,
        xml_id: row.xml_file_id,
        xml_name: row.xml_file_name,
      })),
    };
  },

  // Get the validation status of all receipts associated with a request
  async getExpenseValidations(requestId) {
    const receipts = await prisma.receipt.findMany({
      where: { request_id: requestId },
      include: {
        Receipt_Type: { select: { receipt_type_name: true } },
      },
    });
    if (receipts.length === 0) {
      return {
        request_id: requestId,
        Expenses: []
      };
    }
    // Check if any of the rows have validation 'Pendiente'
    const hasPendingValidation = receipts.some(row => row.validation === 'Pendiente');
    const expense_status = hasPendingValidation ? 'Pendiente' : 'Sin Pendientes';
    // Sort the rows based on the validation status
    const statusOrder = { "Pendiente": 1, "Rechazado": 2, "Aprobado": 3 };
    receipts.sort((a, b) => statusOrder[a.validation] - statusOrder[b.validation]);
    // Format the response
    return {
      request_id: requestId,
      status: expense_status,
      Expenses: receipts.map(row => ({
        receipt_id: row.receipt_id,
        route_id: row.route_id,
        receipt_type_name: row.receipt_type?.receipt_type_name ?? null,
        amount: row.amount,
        currency: row.currency,
        validation: row.validation,
        submission_date: row.submission_date,
        pdf_id: row.pdf_file_id,
        pdf_name: row.pdf_file_name,
        xml_id: row.xml_file_id,
        xml_name: row.xml_file_name
      }))
    };
  },
  
};

export default AccountsPayable;
